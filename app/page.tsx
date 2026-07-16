"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
export default function Root() {
  const router = useRouter();
  useEffect(() => {
    router.replace(localStorage.getItem("userId") ? "/projects/" : "/login/");
  }, [router]);
  return null;
}
