import { useLayoutEffect, useRef } from "react";

export function useAutoScroll() {
    const containerRef = useRef<HTMLDivElement>(null);
    const shouldAutoScrollRef = useRef(true);
    const lastScrollHeightRef = useRef(0);

    // Check after every render if we should auto-scroll
    useLayoutEffect(() => {
        const el = containerRef.current;
        if (!el) return;

        const currentScrollHeight = el.scrollHeight;
        
        // If content grew and we should auto-scroll, do it
        if (currentScrollHeight > lastScrollHeightRef.current && shouldAutoScrollRef.current) {
            el.scrollTop = el.scrollHeight - el.clientHeight;
        }
        
        lastScrollHeightRef.current = currentScrollHeight;
    });

    const handleScroll = () => {
        const el = containerRef.current;
        if (!el) return;
        
        // Check if user is at bottom (within 10px)
        const isAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight <= 10;
        shouldAutoScrollRef.current = isAtBottom;
    };

    return { containerRef, handleScroll };
}
