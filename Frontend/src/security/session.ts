/**
 * Session handling helpers — token expiry UX without changing auth business logic.
 * Listens for API 401 and dispatches a global event; AuthProvider can soft-logout.
 */
const AUTH_STORAGE_KEY = "upsc_mentor_auth";

export function clearLocalSession() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent("md:session-expired"));
}

export function installSessionExpiryInterceptor(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  axiosInstance: { interceptors: { response: { use: Function } } }
) {
  axiosInstance.interceptors.response.use(
    (res: unknown) => res,
    (err: { response?: { status?: number; data?: { message?: string } } }) => {
      const status = err?.response?.status;
      const message = err?.response?.data?.message || "";
      if (
        status === 401 &&
        (message === "Token failed" ||
          message === "Token expired" ||
          message === "Invalid token" ||
          message === "Not authorized" ||
          message === "Unauthorized")
      ) {
        clearLocalSession();
      }
      return Promise.reject(err);
    }
  );
}
