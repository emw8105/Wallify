import React from "react";

interface AlertProps {
  variant?: "default" | "destructive";
  children: React.ReactNode;
}

export const Alert: React.FC<AlertProps> = ({ variant = "default", children }) => {
  const alertClasses =
    variant === "destructive"
      ? "bg-red-100 text-red-700 border border-red-400"
      : "bg-blue-100 text-blue-700 border border-blue-400";
  
  return (
    <div className={`p-4 rounded-lg ${alertClasses}`}>
      {children}
    </div>
  );
};

export const AlertTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="font-bold text-lg">{children}</h2>
);

export const AlertDescription: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="mt-1 text-sm">{children}</p>
);
