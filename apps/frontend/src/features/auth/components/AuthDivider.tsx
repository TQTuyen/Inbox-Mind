import { Separator } from '@fe/shared/components/ui/separator';

export const AuthDivider = () => {
  return (
    <div className="relative my-6">
      <div className="absolute inset-0 flex items-center">
        <Separator className="bg-gray-300 dark:bg-slate-700" />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-white dark:bg-slate-900 px-2 text-gray-500 dark:text-slate-400">
          Or continue with
        </span>
      </div>
    </div>
  );
};
