// app/ui/button.tsx

import clsx from 'clsx';
import { twMerge } from 'tailwind-merge'

type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';
type ButtonVariant = 'default' | 'outline' | 'ghost' | 'secondary' | 'active' | 'warn' | 'confirm';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
  disabled?: boolean;
}

export function Button({
  children,
  className,
  size = 'md',
  variant = 'default',
  disabled,
  ...rest
}: ButtonProps) {
  const sizeClasses = {
    xs: 'h-8 px-2 text-xs',
    sm: 'h-8 px-2 text-md',
    md: 'h-10 px-4 text-lg max-[376px]:text-sm',
    lg: 'h-12 px-6 text-base',
  };

  const variantClasses = {
    default: 'bg-blue-500 text-white enabled:hover:bg-blue-400 active:bg-blue-600',
    secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 active:bg-gray-400',
    outline: 'border border-blue-500 text-blue-500 hover:bg-blue-50',
    ghost: 'bg-transparent text-blue-500 hover:bg-blue-50',
    active: 'bg-blue-500 text-white hover:bg-blue-600',
    warn: 'bg-white text-red-500 hover:bg-red-200',
    confirm: 'text-red-500 border-1 border-red-500 hover:bg-red-500 hover:text-white',
  };

  const buttonClass = clsx(
    'flex flex-row items-center justify-center cursor-pointer rounded-lg font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
    sizeClasses[size],
    variantClasses[variant],
    {
        'opacity-50 pointer-events-none': disabled,
    },
    className,
  )

  return (
    <button
      {...rest}
      className={twMerge(buttonClass)}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
