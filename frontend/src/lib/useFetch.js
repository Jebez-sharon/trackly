import { useCallback, useEffect, useRef, useState } from 'react';
import api from './api';

export default function useFetch(path){
  const [data,setData] = useState(null);
  const [error,setError] = useState(null);
  const [errorStatus, setErrorStatus] = useState(null);
  const[loading, setLoading] = useState(Boolean(path));

  const controllerRef = useRef(null)

  const[trackedPath, setTrackedPath] = useState(path);
  if(path !== trackedPath){
    setTrackedPath(path);
    setData(null);
    setError(null);
    setErrorStatus(null);
    setLoading(Boolean(path)); 
  }

  const run = useCallback(async (opts) => {
    controllerRef.current?.abort();

    if (!path){
      setLoading(false);
      return
    }

    const controller = new AbortController();
    controllerRef.current = controller;

    setError(null)
    setErrorStatus(null)
    if (!opts?.quiet)setLoading(true)
    try{
      const {data:body} = await api.get(path,{signal:controller.signal});
      if (!controller.signal.aborted) setData(body);
    }catch(err){
      if (controller.signal.aborted) return;
      setError(err.message);
      setErrorStatus(err.status ?? null);
    }finally{
      if (!controller.signal.aborted) setLoading(false);
    }
  },[path]);

    useEffect(() => {
    // Fetching on mount is the intended use of an effect. run() sets loading
    // synchronously before its first await, which this rule cannot tell apart
    // from a render loop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    run();
    return () => controllerRef.current?.abort();
  }, [run]);

  return {data,setData, loading, error,errorStatus, refetch:run};
}
