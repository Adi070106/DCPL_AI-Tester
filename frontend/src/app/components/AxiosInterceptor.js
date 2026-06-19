"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

export default function AxiosInterceptor({ children }) {
  const router = useRouter();
  const interceptorRef = useRef(null);

  useEffect(() => {
    // Only setup once
    if (interceptorRef.current === null) {
      interceptorRef.current = axios.interceptors.response.use(
        (response) => response,
        (error) => {
          if (error.response && error.response.status === 401) {
            console.warn("Unauthorized API call detected (401). Clearing session and redirecting...");
            
            // Clear credentials
            localStorage.removeItem("token");
            localStorage.removeItem("user");
            
            // Do a hard redirect to the home/login page to ensure fresh state
            window.location.href = "/";
            
            // Return a pending promise to halt further execution of downstream catch blocks
            return new Promise(() => {});
          }
          return Promise.reject(error);
        }
      );
    }

    return () => {
      if (interceptorRef.current !== null) {
        axios.interceptors.response.eject(interceptorRef.current);
        interceptorRef.current = null;
      }
    };
  }, [router]);

  return children;
}
