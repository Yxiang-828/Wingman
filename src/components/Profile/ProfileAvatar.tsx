import React, { useState } from "react";
import moodyImg from "../../assets/moody.png";

const ProfileAvatar: React.FC = () => {
  const [avatar, setAvatar] = useState<string | null>(null);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setAvatar(URL.createObjectURL(e.target.files[0]));
    }
  };

  return (
    <div>
      <h2>Avatar</h2>
      <img
        src={avatar || moodyImg}
        alt="Avatar"
        style={{ width: 100, height: 100, borderRadius: "50%" }}
      />
      <input type="file" accept="image/*" onChange={handleAvatarChange} />
    </div>
  );
};

export default ProfileAvatar;