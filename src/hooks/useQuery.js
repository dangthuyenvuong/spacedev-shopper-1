import { localStorageCache, sessionStorageCache } from "@/utils/cache"
import { delay } from "@/utils/delay"
import { CanceledError } from "axios"
import { useRef } from "react"
import { useMemo } from "react"
import { useEffect, useState } from "react"

const _cache = {
    localStorage: localStorageCache,
    sessionStorage: sessionStorageCache,
}


const _asyncFunction = {
    // key: Promise
}

export const useQuery = ({
    queryFn,
    queryKey,
    dependencyList = [],
    enabled = true,
    cacheTime,
    keepPrevousData = false,
    limitDuration,
    storeDriver = 'localStorage'
} = {}) => {

    const dataRef = useRef({})

    const cache = _cache[storeDriver]
    const refetchRef = useRef()

    const [data, setData] = useState()
    const [loading, setLoading] = useState(enabled)
    const [error, setError] = useState()
    const [status, setStatus] = useState('idle')

    const cacheName = Array.isArray(queryKey) ? queryKey[0] : queryKey
    const controllerRef = useRef(new AbortController())
    // useEffect(() => {
    //     if (typeof refetchRef.current === 'boolean') {
    //         refetchRef.current = true
    //     }
    // }, dependencyList)

    useEffect(() => {
        return () => {
            controllerRef.current.abort()
        }
    }, [])

    useEffect(() => {
        if (enabled) {
            fetchData()
        }
    }, [enabled].concat(queryKey))


    const getCacheDataOrPrivousData = () => {

        if (cacheName) {
            if (keepPrevousData && dataRef[cacheName]) {
                return dataRef[cacheName]
            }

            if (_asyncFunction[cacheName]) {
                return _asyncFunction[cacheName]
            }

            // Kiểm tra cache xem có dữ liệu hay không
            return cache.get(queryKey)

        }

    }

    const setCacheDataOrPrivousData = (data) => {
        if (keepPrevousData) {
            dataRef[cacheName] = data
        }

        if (cacheName && cacheTime) {
            let expired = cacheTime
            if (cacheTime) {
                expired += Date.now()
            }
            cache.set(cacheName, data, expired)
        }
    }


    const fetchData = async () => {
        controllerRef.current.abort()
        controllerRef.current = new AbortController()
        const startTime = Date.now()

        let res
        let error
        try {
            setLoading(true)
            setStatus('pending')

            res = getCacheDataOrPrivousData()

            if (!res) {
                res = queryFn({ signal: controllerRef.current.signal })
                if (cacheName) {
                    _asyncFunction[cacheName] = res
                }
            }

            if (res instanceof Promise) {
                res = await res
            }



        } catch (err) {
            console.log(err)
            error = err
        }

        const endTime = Date.now()

        if (limitDuration) {
            let timeout = endTime - startTime
            if (timeout < limitDuration) {
                await delay(limitDuration - timeout)
            }
        }

        if (res) {
            setStatus('success')
            setData(res)

            setCacheDataOrPrivousData(res)

            refetchRef.current = false
            setLoading(false)
            return res
        }



        if (error instanceof CanceledError) {

        } else {
            setError(err)
            setStatus('error')
            setLoading(false)
            throw err
        }



    }
    return {
        loading,
        error,
        data,
        status,
        refetch: fetchData
    }
}
