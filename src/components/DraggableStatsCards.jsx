import React from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

function SortableItem({ stat, isDark }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: stat.label });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white dark:bg-dark-card rounded-xl shadow-lg p-6 border border-light-border dark:border-dark-border cursor-move hover:shadow-xl transition-all duration-200"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">{stat.label}</h3>
      </div>
      <p className="text-3xl font-bold text-light-accent dark:text-dark-accent">{stat.value}</p>
    </div>
  );
}

export default function DraggableStatsCards({ stats, onStatsReorder, isDark }) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event) {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = stats.findIndex((stat) => stat.label === active.id);
      const newIndex = stats.findIndex((stat) => stat.label === over.id);
      const newStats = arrayMove(stats, oldIndex, newIndex);
      onStatsReorder(newStats);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={stats.map(stat => stat.label)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.map((stat) => (
            <SortableItem key={stat.label} stat={stat} isDark={isDark} />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
} 