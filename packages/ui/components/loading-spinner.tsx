export default function LoadingSpinner() {
    return (
        <div className='absolute inset-0 flex items-center justify-center bg-white'>
            <div className='text-center'>
                <div className='inline-block w-20 h-20 border-10 border-dotted border-gray-300 rounded-full animate-ping' />
            </div>
        </div>
    );
}
