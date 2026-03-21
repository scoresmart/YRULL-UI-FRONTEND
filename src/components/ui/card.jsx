import * as React from 'react';
import { cn } from '../../lib/utils';

const Card = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('rounded-xl border border-gray-100 bg-white p-6 shadow-sm', className)}
    {...props}
  />
));
Card.displayName = 'Card';

const CardHeader = ({ className, ...props }) => (
  <div className={cn('mb-4 flex items-start justify-between gap-4', className)} {...props} />
);
const CardTitle = ({ className, ...props }) => (
  <div className={cn('text-sm font-medium text-gray-900', className)} {...props} />
);
const CardDescription = ({ className, ...props }) => (
  <div className={cn('text-sm text-gray-500', className)} {...props} />
);
const CardContent = ({ className, ...props }) => <div className={cn('', className)} {...props} />;

export { Card, CardHeader, CardTitle, CardDescription, CardContent };

