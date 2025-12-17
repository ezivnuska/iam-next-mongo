// app/ui/loading-spinner.tsx

export default function LoadingSpinner() {
    return (
        <div className='absolute inset-0 flex items-center justify-center bg-gray-50'>
            <div className='text-center'>
                <div className='inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4' />
                <p className='text-gray-600'>Loading...</p>
            </div>
        </div>
    );
}
