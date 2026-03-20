-- カレンダー予定（calendar_schedules）の Undo/Redo スタックと、変更を1トランザクションで記録する RPC。
-- 古いエントリは最大 50 件（同一 calendar + user の未 undo 分）にトリム。

CREATE TABLE IF NOT EXISTS iriam.calendar_schedule_undo_stack (
  id uuid NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_id uuid NOT NULL REFERENCES iriam.calendars(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  op text NOT NULL CHECK (op IN ('create', 'update', 'delete')),
  schedule_id uuid NOT NULL,
  before_row jsonb,
  after_row jsonb,
  undone_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_calendar_schedule_undo_stack_active
  ON iriam.calendar_schedule_undo_stack (calendar_id, user_id, created_at DESC)
  WHERE undone_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_calendar_schedule_undo_stack_redo
  ON iriam.calendar_schedule_undo_stack (calendar_id, user_id, undone_at DESC)
  WHERE undone_at IS NOT NULL;

COMMENT ON TABLE iriam.calendar_schedule_undo_stack IS '予定変更の Undo/Redo 履歴。RPC のみが書き込む想定。';

REVOKE ALL ON TABLE iriam.calendar_schedule_undo_stack FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE iriam.calendar_schedule_undo_stack TO postgres;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE iriam.calendar_schedule_undo_stack TO service_role;

-- ---------------------------------------------------------------------------
-- helpers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION iriam._sched_time_from_json(j jsonb, k text)
RETURNS time without time zone
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN j IS NULL OR j->>k IS NULL OR btrim(j->>k) = '' OR j->>k = 'null' THEN NULL
    ELSE (substring(j->>k, 1, 12))::time
  END;
$$;

CREATE OR REPLACE FUNCTION iriam._sched_end_date_from_json(j jsonb)
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN j IS NULL OR j->>'end_date' IS NULL OR j->>'end_date' = 'null' OR btrim(j->>'end_date') = '' THEN NULL
    ELSE (j->>'end_date')::date
  END;
$$;

CREATE OR REPLACE FUNCTION iriam._assert_calendar_owner(p_calendar_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = iriam, public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM iriam.calendars c
    WHERE c.id = p_calendar_id AND c.owner_id = p_user_id
  ) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION iriam._trim_undo_stack(p_calendar_id uuid, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = iriam, public
AS $$
BEGIN
  DELETE FROM iriam.calendar_schedule_undo_stack s
  WHERE s.calendar_id = p_calendar_id
    AND s.user_id = p_user_id
    AND s.undone_at IS NULL
    AND s.id NOT IN (
      SELECT t.id
      FROM iriam.calendar_schedule_undo_stack t
      WHERE t.calendar_id = p_calendar_id
        AND t.user_id = p_user_id
        AND t.undone_at IS NULL
      ORDER BY t.created_at DESC
      LIMIT 50
    );
END;
$$;

CREATE OR REPLACE FUNCTION iriam._insert_schedule_from_jsonb(r jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = iriam, public
AS $$
BEGIN
  INSERT INTO iriam.calendar_schedules (
    id,
    calendar_id,
    date,
    end_date,
    start_time,
    end_time,
    is_all_day,
    title,
    kind,
    visibility,
    color_id,
    memo,
    created_at
  ) VALUES (
    (r->>'id')::uuid,
    (r->>'calendar_id')::uuid,
    (r->>'date')::date,
    iriam._sched_end_date_from_json(r),
    iriam._sched_time_from_json(r, 'start_time'),
    iriam._sched_time_from_json(r, 'end_time'),
    COALESCE((r->>'is_all_day')::boolean, false),
    COALESCE(r->>'title', ''),
    NULLIF(r->>'kind', 'null'),
    NULLIF(r->>'visibility', 'null'),
    NULLIF(r->>'color_id', 'null'),
    NULLIF(r->>'memo', 'null'),
    COALESCE((r->>'created_at')::timestamptz, now())
  );
END;
$$;

CREATE OR REPLACE FUNCTION iriam._update_schedule_from_jsonb(r jsonb, p_id uuid, p_calendar_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = iriam, public
AS $$
BEGIN
  UPDATE iriam.calendar_schedules s SET
    date = (r->>'date')::date,
    end_date = iriam._sched_end_date_from_json(r),
    start_time = iriam._sched_time_from_json(r, 'start_time'),
    end_time = iriam._sched_time_from_json(r, 'end_time'),
    is_all_day = COALESCE((r->>'is_all_day')::boolean, false),
    title = COALESCE(r->>'title', s.title),
    kind = NULLIF(r->>'kind', 'null'),
    visibility = NULLIF(r->>'visibility', 'null'),
    color_id = NULLIF(r->>'color_id', 'null'),
    memo = NULLIF(r->>'memo', 'null')
  WHERE s.id = p_id AND s.calendar_id = p_calendar_id;
END;
$$;

-- ---------------------------------------------------------------------------
-- p_before NULL => create; 非 NULL => update
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION iriam.calendar_schedule_apply_upsert_undo(p_before jsonb, p_after jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = iriam, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_cid uuid := (p_after->>'calendar_id')::uuid;
  v_sid uuid;
  v_after_snap jsonb;
BEGIN
  PERFORM iriam._assert_calendar_owner(v_cid, v_uid);

  DELETE FROM iriam.calendar_schedule_undo_stack s
  WHERE s.calendar_id = v_cid
    AND s.user_id = v_uid
    AND s.undone_at IS NOT NULL;

  IF p_before IS NULL THEN
    IF p_after ? 'id'
       AND p_after->>'id' IS NOT NULL
       AND btrim(p_after->>'id') <> ''
       AND p_after->>'id' <> 'null'
    THEN
      v_sid := (p_after->>'id')::uuid;
    ELSE
      v_sid := gen_random_uuid();
    END IF;
    PERFORM iriam._insert_schedule_from_jsonb(
      jsonb_set(p_after, '{id}', to_jsonb(v_sid::text), true)
    );
    SELECT to_jsonb(s.*) INTO v_after_snap
    FROM iriam.calendar_schedules s
    WHERE s.id = v_sid;

    INSERT INTO iriam.calendar_schedule_undo_stack (
      calendar_id, user_id, op, schedule_id, before_row, after_row
    ) VALUES (v_cid, v_uid, 'create', v_sid, NULL, v_after_snap);
  ELSE
    v_sid := (p_after->>'id')::uuid;
    IF v_sid IS NULL OR (p_before->>'id')::uuid IS DISTINCT FROM v_sid THEN
      RAISE EXCEPTION 'invalid upsert undo payload';
    END IF;

    PERFORM iriam._update_schedule_from_jsonb(p_after, v_sid, v_cid);

    SELECT to_jsonb(s.*) INTO v_after_snap
    FROM iriam.calendar_schedules s
    WHERE s.id = v_sid;

    INSERT INTO iriam.calendar_schedule_undo_stack (
      calendar_id, user_id, op, schedule_id, before_row, after_row
    ) VALUES (v_cid, v_uid, 'update', v_sid, p_before, v_after_snap);
  END IF;

  PERFORM iriam._trim_undo_stack(v_cid, v_uid);
END;
$$;

CREATE OR REPLACE FUNCTION iriam.calendar_schedule_apply_delete_undo(p_calendar_id uuid, p_schedule_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = iriam, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_before jsonb;
BEGIN
  PERFORM iriam._assert_calendar_owner(p_calendar_id, v_uid);

  DELETE FROM iriam.calendar_schedule_undo_stack s
  WHERE s.calendar_id = p_calendar_id
    AND s.user_id = v_uid
    AND s.undone_at IS NOT NULL;

  SELECT to_jsonb(s.*) INTO v_before
  FROM iriam.calendar_schedules s
  WHERE s.id = p_schedule_id AND s.calendar_id = p_calendar_id;

  IF v_before IS NULL THEN
    RAISE EXCEPTION 'schedule not found';
  END IF;

  DELETE FROM iriam.calendar_schedules s
  WHERE s.id = p_schedule_id AND s.calendar_id = p_calendar_id;

  INSERT INTO iriam.calendar_schedule_undo_stack (
    calendar_id, user_id, op, schedule_id, before_row, after_row
  ) VALUES (p_calendar_id, v_uid, 'delete', p_schedule_id, v_before, NULL);

  PERFORM iriam._trim_undo_stack(p_calendar_id, v_uid);
END;
$$;

CREATE OR REPLACE FUNCTION iriam.calendar_schedule_undo(p_calendar_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = iriam, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  r iriam.calendar_schedule_undo_stack%ROWTYPE;
BEGIN
  PERFORM iriam._assert_calendar_owner(p_calendar_id, v_uid);

  SELECT * INTO r
  FROM iriam.calendar_schedule_undo_stack s
  WHERE s.calendar_id = p_calendar_id
    AND s.user_id = v_uid
    AND s.undone_at IS NULL
  ORDER BY s.created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF r.op = 'create' THEN
    DELETE FROM iriam.calendar_schedules x WHERE x.id = r.schedule_id;
  ELSIF r.op = 'update' THEN
    PERFORM iriam._update_schedule_from_jsonb(r.before_row, r.schedule_id, p_calendar_id);
  ELSIF r.op = 'delete' THEN
    PERFORM iriam._insert_schedule_from_jsonb(r.before_row);
  END IF;

  UPDATE iriam.calendar_schedule_undo_stack s
  SET undone_at = now()
  WHERE s.id = r.id;
END;
$$;

CREATE OR REPLACE FUNCTION iriam.calendar_schedule_redo(p_calendar_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = iriam, public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  r iriam.calendar_schedule_undo_stack%ROWTYPE;
BEGIN
  PERFORM iriam._assert_calendar_owner(p_calendar_id, v_uid);

  SELECT * INTO r
  FROM iriam.calendar_schedule_undo_stack s
  WHERE s.calendar_id = p_calendar_id
    AND s.user_id = v_uid
    AND s.undone_at IS NOT NULL
  ORDER BY s.undone_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF r.op = 'create' THEN
    PERFORM iriam._insert_schedule_from_jsonb(r.after_row);
  ELSIF r.op = 'update' THEN
    PERFORM iriam._update_schedule_from_jsonb(r.after_row, r.schedule_id, p_calendar_id);
  ELSIF r.op = 'delete' THEN
    DELETE FROM iriam.calendar_schedules x WHERE x.id = r.schedule_id;
  END IF;

  UPDATE iriam.calendar_schedule_undo_stack s
  SET undone_at = NULL
  WHERE s.id = r.id;
END;
$$;

GRANT EXECUTE ON FUNCTION iriam.calendar_schedule_apply_upsert_undo(jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION iriam.calendar_schedule_apply_delete_undo(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION iriam.calendar_schedule_undo(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION iriam.calendar_schedule_redo(uuid) TO authenticated;
