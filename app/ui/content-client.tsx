// app/ui/content-client.tsx
"use client";

import { useState, ComponentType } from "react";
import Modal from "@/app/ui/modal";
import { Button } from "@/app/ui/button";

interface ListComponentProps<T> {
    items: T[];
    onDeleted: (id: string) => void;
    onEdit: (item: T) => void;
    onFlag: (item: T) => void;
}

interface FormComponentProps<T> {
    onSuccess: (item: T) => void;
    onClose: () => void;
    editItem?: T;
}

interface ContentClientProps<T extends { id: string }> {
    initialItems: T[];
    addButtonText: string;
    createModalTitle: string;
    editModalTitle?: string;
    ListComponent: ComponentType<ListComponentProps<T>>;
    FormComponent: ComponentType<FormComponentProps<T>>;
}

export default function ContentClient<T extends { id: string }>({
    initialItems,
    addButtonText,
    createModalTitle,
    editModalTitle,
    ListComponent,
    FormComponent,
}: ContentClientProps<T>) {
    const [items, setItems] = useState<T[]>(initialItems);
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<T | undefined>(undefined);

    const handleSuccess = (updatedItem: T) => {
        if (editingItem) {
            setItems((prev) => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
        } else {
            setItems((prev) => [updatedItem, ...prev]);
        }
        setModalOpen(false);
        setEditingItem(undefined);
    };

    const handleDeleted = (itemId: string) => {
        setItems(prev => prev.filter(item => item.id !== itemId));
    };

    const handleEdit = (item: T) => {
        setEditingItem(item);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setEditingItem(undefined);
    };

    const handleFlag = (item: T) => {
        console.log(item.id, 'flagged')
    }

    return (
        <div>
            <Button onClick={() => setModalOpen(true)} className="mb-4">
                {addButtonText}
            </Button>

            <ListComponent
                items={items}
                onDeleted={handleDeleted}
                onEdit={handleEdit}
                onFlag={handleFlag}
            />

            <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
                <div className='flex flex-row items-center justify-between mb-4'>
                    <h1 className="text-2xl font-semibold">
                        {editingItem ? (editModalTitle || createModalTitle) : createModalTitle}
                    </h1>

                    <button
                        className="text-gray-500 hover:text-gray-700 text-2xl leading-none cursor-pointer"
                        onClick={() => setModalOpen(false)}
                        aria-label="Close"
                    >
                        ✕
                    </button>
                </div>

                <FormComponent
                    onSuccess={handleSuccess}
                    onClose={handleCloseModal}
                    editItem={editingItem}
                />
            </Modal>
        </div>
    );
}
