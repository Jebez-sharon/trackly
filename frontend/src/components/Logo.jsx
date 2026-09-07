export default function Logo({className='w-5 h-5'}){
    return(
        <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
            <rect x="3.5" y="4" width="4.5" height="16" rx="1.75" fill="currentColor" opacity="0.5"/>
            <rect x="9.75" y="4" width="4.5" height="10" rx="1.75" fill="currentColor"/>
            <rect x="16" y="4" width="4.5" height="13" rx="1.75" fill="currentColor" opacity="0.75"/>
        </svg>
    );
}

