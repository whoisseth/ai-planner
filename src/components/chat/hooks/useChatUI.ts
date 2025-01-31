"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export const useChatUI = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [width, setWidth] = useState(500);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, []);

  const handleScroll = useCallback(
    (
      e: React.UIEvent<HTMLDivElement>,
      hasMore: boolean,
      isLoadingMore: boolean,
      isLoadingHistory: boolean,
      onLoadMore: () => void,
    ) => {
      const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;

      // Show scroll button when scrolled up just a little (20px)
      const isAtBottom = scrollHeight - scrollTop - clientHeight < 20;
      setShowScrollButton(!isAtBottom);

      // Load more messages when:
      // 1. We're very close to the top (within 50px)
      // 2. We have more messages to load
      // 3. We're not currently loading
      // 4. User is actively scrolling up (scrollTop is decreasing)
      if (scrollTop < 100 && hasMore && !isLoadingMore && !isLoadingHistory) {
        // Get the scroll element
        const scrollElement = e.currentTarget;

        // If we're at the very top (scrollTop < 5) OR
        // if the user is trying to scroll up (negative scrollTop in a wheel event)
        // Note: We use 5px instead of 0 to account for bounce scroll effects
        if (
          scrollTop < 5 ||
          (scrollElement.scrollTop === 0 &&
            "deltaY" in e &&
            (e as any).deltaY < 0)
        ) {
          console.log("Loading more messages...");
          onLoadMore();
        }
      }
    },
    [],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(true);
      setStartX(e.clientX);
      setStartWidth(width);
    },
    [width],
  );

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = startX - e.clientX;
      const newWidth = Math.max(400, Math.min(1200, startWidth + deltaX));
      setWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "none";
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.userSelect = "";
    };
  }, [isDragging, startX, startWidth]);

  useEffect(() => {
    const checkMobile = () => {
      const isMobileView = window.innerWidth < 768;
      setIsMobile(isMobileView);
      if (isMobileView && isOpen) {
        setIsFullScreen(true);
      }
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, [isOpen]);

  const adjustTextareaHeight = useCallback(() => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      textarea.style.height = "48px";
      const scrollHeight = textarea.scrollHeight;
      const minHeight = 48;
      const maxHeight = 300;
      const newHeight = Math.min(Math.max(scrollHeight, minHeight), maxHeight);
      textarea.style.height = `${newHeight}px`;
      textarea.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden";
    }
  }, []);

  return {
    isOpen,
    setIsOpen,
    isDragging,
    isFullScreen,
    setIsFullScreen,
    width,
    setWidth,
    isMobile,
    showScrollButton,
    chatBoxRef,
    messagesEndRef,
    textareaRef,
    scrollToBottom,
    handleScroll,
    handleMouseDown,
    adjustTextareaHeight,
  };
};
