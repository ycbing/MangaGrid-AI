// 管理员鉴权 helper：ADMIN_USER_IDS 逗号分隔（.env.local），
// 未配置时回退首个用户（实际生产中应有 role 字段）。
// 客户端判断请用 NEXT_PUBLIC_ADMIN_USER_IDS（见 components/settings/model-config-settings.tsx）。

const ADMIN_USER_IDS = (process.env.ADMIN_USER_IDS || "")
  .split(",")
  .filter(Boolean);

const FALLBACK_ADMIN_ID = "f9d3168a-f21f-44e2-8343-d47d7690298e";

export function isAdminUser(userId: string): boolean {
  if (ADMIN_USER_IDS.length > 0) {
    return ADMIN_USER_IDS.includes(userId);
  }
  return userId === FALLBACK_ADMIN_ID;
}
