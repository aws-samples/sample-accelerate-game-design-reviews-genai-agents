import { useState, useCallback, useRef, useEffect } from 'react';
import { ErrorHandler, RetryHandler } from '../utils/errorHandler';

interface LoadingState {
  isLoading: boolean;
  error: string | null;
  data: any;
}

interface UseLoadingStateOptions {
  initialData?: any;
  retryAttempts?: number;
  onError?: (error: any) => void;
  onSuccess?: (data: any) => void;
}

export const useLoadingState = <T = any>(options: UseLoadingStateOptions = {}) => {
  const {
    initialData = null,
    retryAttempts = 0,
    onError,
    onSuccess
  } = options;

  // Use refs to store callbacks to avoid recreating execute function
  const onErrorRef = useRef(onError);
  const onSuccessRef = useRef(onSuccess);

  // Update refs when callbacks change
  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
  }, [onSuccess]);

  const [state, setState] = useState<LoadingState>({
    isLoading: false,
    error: null,
    data: initialData
  });

  const execute = useCallback(async (asyncOperation: () => Promise<T>): Promise<T | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      let result: T;
      
      if (retryAttempts > 0) {
        result = await RetryHandler.withRetry(asyncOperation, retryAttempts);
      } else {
        result = await asyncOperation();
      }

      setState(prev => ({ ...prev, isLoading: false, data: result }));
      onSuccessRef.current?.(result);
      return result;
    } catch (error) {
      const appError = ErrorHandler.parseError(error);
      const errorMessage = ErrorHandler.getUserMessage(appError);
      
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      ErrorHandler.logError(appError, 'useLoadingState');
      onErrorRef.current?.(appError);
      return null;
    }
  }, [retryAttempts]); // Remove onError and onSuccess from dependencies

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      data: initialData
    });
  }, [initialData]);

  const setData = useCallback((data: T) => {
    setState(prev => ({ ...prev, data }));
  }, []);

  const setError = useCallback((error: string) => {
    setState(prev => ({ ...prev, error, isLoading: false }));
  }, []);

  return {
    ...state,
    execute,
    reset,
    setData,
    setError
  };
};

// Specialized hook for form submissions
export const useFormSubmission = <T = any>(options: UseLoadingStateOptions = {}) => {
  const loadingState = useLoadingState<T>(options);

  const submitForm = useCallback(async (
    formData: any,
    submitFunction: (data: any) => Promise<T>
  ): Promise<T | null> => {
    return loadingState.execute(() => submitFunction(formData));
  }, [loadingState.execute]);

  return {
    ...loadingState,
    submitForm
  };
};

// Specialized hook for data fetching
export const useDataFetching = <T = any>(options: UseLoadingStateOptions = {}) => {
  const loadingState = useLoadingState<T>({
    ...options,
    retryAttempts: options.retryAttempts ?? 2 // Default retry for data fetching
  });

  const fetchData = useCallback(async (
    fetchFunction: () => Promise<T>
  ): Promise<T | null> => {
    return loadingState.execute(fetchFunction);
  }, [loadingState.execute]);

  const refetch = useCallback(async (
    fetchFunction: () => Promise<T>
  ): Promise<T | null> => {
    return loadingState.execute(fetchFunction);
  }, [loadingState.execute]);

  return {
    ...loadingState,
    fetchData,
    refetch
  };
};