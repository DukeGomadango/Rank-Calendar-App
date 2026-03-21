/** 開発用モック表示用の no-op サーバーアクション（本番ロジックとは分離）。 */

export async function noopMoveEntry(
  _calendarId: string,
  _fromDate: string,
  _toDate: string
) {
  "use server";
  void _calendarId;
  void _fromDate;
  void _toDate;
}

export async function noopSaveEntry(_formData: FormData) {
  "use server";
  void _formData;
}

export async function noopUpdateScheduleEntryField(
  _calendarId: string,
  _date: string,
  _field: string,
  _value: string | number | boolean
) {
  "use server";
  void _calendarId;
  void _date;
  void _field;
  void _value;
}
