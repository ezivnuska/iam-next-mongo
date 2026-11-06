'use client';

import BioForm from '@/app/profile/bio-form';

interface UserBioProps {
    bio?: string;
    editable?: boolean;
}

export default function UserBio({ bio, editable }: UserBioProps) {
    return (
        <div className='flex flex-row items-start gap-4'>
            <p className='flex flex-1 text-gray-600'>{bio || ''}</p>
            {editable && <BioForm />}
        </div>
    );
}
