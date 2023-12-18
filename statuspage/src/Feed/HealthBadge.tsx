import React from 'react'

export default function HealthyBadge({ healthy = false }: { healthy: boolean }) {
    if (healthy) {
        return <span className="bg-green-100 text-green-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded dark:bg-green-900 dark:text-green-300">healthy</span>
    }
    return <span className="bg-yellow-100 text-yellow-800 text-xs font-medium me-2 px-2.5 py-0.5 rounded dark:bg-yellow-900 dark:text-yellow-300">unhealthy</span>
}