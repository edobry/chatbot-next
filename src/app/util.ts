import { useEffect, useRef, useState } from "react";

export function useAutoScroll(threshold = 16) {
    const containerRef = useRef<HTMLDivElement>(null);
    const wasAtBottomRef = useRef(true);
    const [observedEl, setObservedEl] = useState<Element | null>(null);

    const handleScroll = () => {
        const el = containerRef.current;
        if (!el) return;
        
        wasAtBottomRef.current =
            el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
    };

    useEffect(() => {
        if (!observedEl) return;

        const ro = new ResizeObserver(() => {
            if (wasAtBottomRef.current) {
                observedEl.scrollIntoView({ block: "end", behavior: "smooth" });
            }
        });
        ro.observe(observedEl);

        return () => ro.disconnect();
    }, [observedEl]);

    const registerBottom = (el: Element | null) => {
        setObservedEl(el);
    };

    return { containerRef, handleScroll, registerBottom };
}
