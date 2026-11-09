'use client'
import React from 'react'
import { PropagateLoader } from 'react-spinners'

const LoadingSpinner = () => {
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100vh',
            }}>
            <PropagateLoader color="rgb(var(--c-accent))" size={10} />
        </div>
    )
}
export default LoadingSpinner
