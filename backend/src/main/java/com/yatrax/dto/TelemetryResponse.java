package com.yatrax.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TelemetryResponse {

    private long uptimeMs;

    // JVM Memory (bytes)
    private long heapUsed;
    private long heapMax;
    private long heapCommitted;

    // CPU & OS load
    private double cpuLoad;
    private double systemLoadAverage;
    private long freePhysicalMemory;
    private long totalPhysicalMemory;

    // Threads
    private int threadCount;
    private int peakThreadCount;

    // Database Pool (HikariCP)
    private boolean dbPoolAvailable;
    private int dbActiveConnections;
    private int dbIdleConnections;
    private int dbTotalConnections;
    private int dbMaxConnections;
    private int dbThreadsAwaiting;
}
