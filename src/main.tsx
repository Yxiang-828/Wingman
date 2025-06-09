import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import "./main.css";
import Avatar from "./Pages/Avatar";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

{
  path: "/profile",
  element: <Profile />,
  children: [
    {
      path: "",
      element: <ProfileSettings />,
    },
    {
      path: "settings",
      element: <ProfileSettings />,
    },
    {
      path: "avatar",
      element: <Avatar />,
    },
  ],
},
