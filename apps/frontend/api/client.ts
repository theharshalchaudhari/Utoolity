import axios from "axios";

declare const process: {
  env: {
    NEXT_PUBLIC_API_URL?: string;
  };
};

export const api = axios.create({
  baseURL:
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});
