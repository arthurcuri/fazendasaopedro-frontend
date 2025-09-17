import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ children, ...props }) => {
  return (
    <button
      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
      {...props}
    >
      {children}
    </button>
  );
};
