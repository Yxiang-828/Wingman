export const logout = () => {
  // Clear authentication
  localStorage.removeItem("wingman_user");
  localStorage.removeItem("wingman_token");
  localStorage.removeItem("authToken");

  // Redirect to login
  // window.location.href = "/login";
};
