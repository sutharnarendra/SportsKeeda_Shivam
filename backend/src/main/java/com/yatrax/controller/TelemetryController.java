package com.yatrax.controller;

import java.lang.management.ManagementFactory;
import java.lang.management.ThreadMXBean;

import javax.sql.DataSource;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.yatrax.dto.TelemetryResponse;
import com.zaxxer.hikari.HikariDataSource;

@RestController
@RequestMapping("/api/admin/telemetry")
public class TelemetryController {

    @Autowired
    private DataSource dataSource;

    @GetMapping
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<TelemetryResponse> getSystemTelemetry() {
        TelemetryResponse.TelemetryResponseBuilder builder = TelemetryResponse.builder();

        // 1. Uptime
        builder.uptimeMs(ManagementFactory.getRuntimeMXBean().getUptime());

        // 2. JVM Memory
        Runtime runtime = Runtime.getRuntime();
        long totalMemory = runtime.totalMemory();
        long freeMemory = runtime.freeMemory();
        builder.heapUsed(totalMemory - freeMemory)
                .heapMax(runtime.maxMemory())
                .heapCommitted(totalMemory);

        // 3. CPU & Physical Memory (com.sun.management.OperatingSystemMXBean)
        java.lang.management.OperatingSystemMXBean osMXBean = ManagementFactory.getOperatingSystemMXBean();
        if (osMXBean instanceof com.sun.management.OperatingSystemMXBean) {
            com.sun.management.OperatingSystemMXBean sunOsBean = (com.sun.management.OperatingSystemMXBean) osMXBean;
            builder.cpuLoad(sunOsBean.getCpuLoad()).freePhysicalMemory(sunOsBean.getFreeMemorySize())
                    .totalPhysicalMemory(sunOsBean.getTotalMemorySize());
        } else {
            builder.cpuLoad(-1.0)
                    .freePhysicalMemory(-1)
                    .totalPhysicalMemory(-1);
        }
        builder.systemLoadAverage(osMXBean.getSystemLoadAverage());

        // 4. Thread metrics
        ThreadMXBean threadBean = ManagementFactory.getThreadMXBean();
        builder.threadCount(threadBean.getThreadCount())
                .peakThreadCount(threadBean.getPeakThreadCount());

        // 5. Database Connection Pool Metrics
        if (dataSource instanceof HikariDataSource) {
            HikariDataSource hikari = (HikariDataSource) dataSource;
            builder.dbPoolAvailable(true)
                    .dbMaxConnections(hikari.getMaximumPoolSize());
            if (hikari.getHikariPoolMXBean() != null) {
                builder.dbActiveConnections(hikari.getHikariPoolMXBean().getActiveConnections())
                        .dbIdleConnections(hikari.getHikariPoolMXBean().getIdleConnections())
                        .dbTotalConnections(hikari.getHikariPoolMXBean().getTotalConnections())
                        .dbThreadsAwaiting(hikari.getHikariPoolMXBean().getThreadsAwaitingConnection());
            }
        } else {
            builder.dbPoolAvailable(false);
        }
        return ResponseEntity.ok(builder.build());
    }
}
