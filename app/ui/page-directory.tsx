// app/ui/page-directory.tsx

import FindOrInviteForm from './find-or-invite-form';

interface PageDirectoryProps {
    authenticated?: boolean;
}

export default function PageDirectory({ authenticated = false }: PageDirectoryProps) {
    if (!authenticated) return null;
    return <FindOrInviteForm />;
}
