import { ButtonHTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', fullWidth, loading, className, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={clsx(
          // Base styles
          'inline-flex items-center justify-center font-medium rounded-lg',
          'transition-all duration-200 ease-in-out',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',

          // Variant styles
          {
            // Primary - Gradient blue with shadow
            'bg-gradient-to-r from-primary-600 to-primary-700 text-white': variant === 'primary',
            'hover:from-primary-700 hover:to-primary-800 shadow-button hover:shadow-button-hover': variant === 'primary' && !disabled,
            'focus:ring-primary-500': variant === 'primary',

            // Secondary - Light with border
            'bg-white text-gray-700 border-2 border-gray-300': variant === 'secondary',
            'hover:bg-gray-50 hover:border-gray-400': variant === 'secondary' && !disabled,
            'focus:ring-gray-400': variant === 'secondary',

            // Success - Green gradient
            'bg-gradient-to-r from-accent-green to-emerald-600 text-white': variant === 'success',
            'hover:from-emerald-600 hover:to-emerald-700 shadow-button hover:shadow-button-hover': variant === 'success' && !disabled,
            'focus:ring-accent-green': variant === 'success',

            // Danger - Red gradient
            'bg-gradient-to-r from-accent-red to-red-600 text-white': variant === 'danger',
            'hover:from-red-600 hover:to-red-700 shadow-button hover:shadow-button-hover': variant === 'danger' && !disabled,
            'focus:ring-accent-red': variant === 'danger',

            // Ghost - Transparent
            'bg-transparent text-gray-700 hover:bg-gray-100': variant === 'ghost',
            'focus:ring-gray-400': variant === 'ghost',
          },

          // Size styles
          {
            'px-3 py-1.5 text-sm': size === 'sm',
            'px-4 py-2 text-base': size === 'md',
            'px-6 py-3 text-lg': size === 'lg',
          },

          // Full width
          { 'w-full': fullWidth },

          className
        )}
        {...props}
      >
        {loading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
