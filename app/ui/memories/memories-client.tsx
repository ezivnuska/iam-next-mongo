// app/ui/memories/memories-client.tsx

"use client";

import { useState } from "react";
import Modal from "@/app/ui/modal";
import CreateMemoryForm from "@/app/ui/memories/create-memory-form";
import MemoryList from "@/app/ui/memories/memory-list";
import { Button } from "@/app/ui/button";
import type { Memory } from "@/app/lib/definitions/memory";

interface MemoriesClientProps {
  initialMemories: Memory[];
}

export default function MemoriesClient({ initialMemories }: MemoriesClientProps) {
  const [memories, setMemories] = useState<Memory[]>(initialMemories);
  const [isModalOpen, setModalOpen] = useState(false);
  const [editingMemory, setEditingMemory] = useState<Memory | undefined>(undefined);

  const handleMemorySuccess = (updatedMemory: Memory) => {
    if (editingMemory) {
      // Update existing memory
      setMemories((prev) =>
        prev.map(m => m.id === updatedMemory.id ? updatedMemory : m)
      );
    } else {
      // Add new memory
      setMemories((prev) => [updatedMemory, ...prev]);
    }
    setModalOpen(false);
    setEditingMemory(undefined);
  };

  const handleMemoryDeleted = (memoryId: string) => {
    setMemories(prev => prev.filter(m => m.id !== memoryId));
  };

  const handleEditMemory = (memory: Memory) => {
    setEditingMemory(memory);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditingMemory(undefined);
  };

  return (
    <div>
      <Button
        onClick={() => setModalOpen(true)}
        className="mb-4"
      >
        Add Memory
      </Button>

      <MemoryList
        memories={memories}
        onDeleted={handleMemoryDeleted}
        onEdit={handleEditMemory}
      />

      <Modal isOpen={isModalOpen} onClose={handleCloseModal}>
        <h1 className="mb-4 text-2xl font-semibold">
          {editingMemory ? "Edit Memory" : "Create a Memory"}
        </h1>
        <CreateMemoryForm
          onSuccess={handleMemorySuccess}
          onClose={handleCloseModal}
          editMemory={editingMemory}
        />
      </Modal>
    </div>
  );
}
