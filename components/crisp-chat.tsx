"use client";

import { useEffect } from "react";
import { Crisp } from "crisp-sdk-web";

export const CrispChat = () => {
  useEffect(() => {
    Crisp.configure("6b32b547-db6d-4453-941c-f9d1970098a4");
  }, []);

  return null;
};