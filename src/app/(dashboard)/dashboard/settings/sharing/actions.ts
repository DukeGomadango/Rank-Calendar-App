// このルートは /dashboard/sharing へリダイレクトされるため、
// 実装は本体 actions へ委譲して重複を避ける。
export {
  createRole,
  deleteRole,
  saveRolePermissions,
  createInviteLinkAction,
  deleteInviteLink,
  assignRoleToUser,
  removeShare,
  noopCreateRole,
  noopDeleteRole,
  noopSaveRolePermissions,
  noopCreateInviteLinkAction,
  noopDeleteInviteLink,
  noopAssignRoleToUser,
} from "@/app/(dashboard)/dashboard/sharing/actions";
