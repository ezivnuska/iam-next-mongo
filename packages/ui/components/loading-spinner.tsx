export default function LoadingSpinner({ fullscreen = true }: { fullscreen?: boolean }) {
    return (
        <div className={fullscreen ? 'fixed inset-0 flex items-center justify-center bg-black' : 'flex flex-1 items-center justify-center'}>
            <div className='inline-block w-20 h-20 border-10 border-dotted border-white rounded-full animate-ping' />
        </div>
    );
}
