import { useEffect, useRef } from 'react';

export default function useFocusTrap(active, onClose){
    const containerRef = useRef(null);
    const lastFocused = useRef(null);
    const onCloseRef = useRef(onClose);

    useEffect(() => {
        onCloseRef.current = onClose;
    });

    useEffect(() =>{
        if(!active) return;

        lastFocused.current = document.activeElement;
        const node = containerRef.current;
        if(!node) return

        const SELECTOR = 'a[href], button:not([disabled]), select, textarea, input:not([disabled]),[tabindex]:not([tabindex="-1"])'
        const focusables = () => [...node.querySelectorAll(SELECTOR)]

        node.focus();

        const onKey = (e) =>{
            if(e.key === 'Escape'){
                onCloseRef.current?.();
                return;
            }
            if(e.key !== 'Tab') return;

            const items = focusables();
            if(!items.length) return;
            const first = items[0];
            const last = items[items.length-1]

            if(e.shiftKey && document.activeElement === first){
                e.preventDefault();
                last.focus();
            }else if(!e.shiftKey && document.activeElement === last){
                e.preventDefault();
                first.focus();
            }
        };
        document.addEventListener('keydown', onKey);
        document.body.style.overflow = 'hidden';

        return ()=>{
            document.removeEventListener('keydown', onKey);
            document.body.style.overflow = '';
            lastFocused.current?.focus();
        };
    },[active]);

    return containerRef;
}

