import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from "prom-client";

export const metricsRegistry = new Registry();

collectDefaultMetrics({
  register: metricsRegistry,
  prefix: "api_",
});

export const httpRequestsTotal = new Counter({
  name: "http_requests_total",
  help: "Total amount of processed HTTP requests",
  labelNames: ["method", "route", "status"],
  registers: [metricsRegistry],
});

export const httpRequestDurationMs = new Histogram({
  name: "http_request_duration_ms",
  help: "Duration of HTTP requests in milliseconds",
  labelNames: ["method", "route", "status"],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 3000, 10000],
  registers: [metricsRegistry],
});
