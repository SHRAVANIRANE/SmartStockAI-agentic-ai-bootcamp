import { useEffect, useState } from "react";
import {
  BadgePercent,
  CalendarClock,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudSun,
  Flame,
  ShieldCheck,
  Wind,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1";

interface FactorInfo {
  date: string;
  weather: string;
  is_holiday: boolean;
  competitor_undercut: boolean;
}

const getWeatherIcon = (weather: string): LucideIcon => {
  const w = weather.toLowerCase();
  if (w.includes("snow") || w.includes("cold")) return CloudSnow;
  if (w.includes("rain")) return CloudRain;
  if (w.includes("cloud")) return Cloud;
  if (w.includes("wind")) return Wind;
  if (w.includes("hot")) return Flame;
  return CloudSun;
};

export default function ExternalFactors({
  storeId,
  productId,
}: {
  storeId: string;
  productId: string;
}) {
  const [factors, setFactors] = useState<FactorInfo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`${API}/forecast/external_factors?store_id=${storeId}&product_id=${productId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error("API Error");
        return r.json();
      })
      .then((data) => setFactors(data.upcoming_factors || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [storeId, productId]);

  if (loading || factors.length === 0) return null;

  return (
    <section className="factor-section">
      <h3 className="card-title">
        <CalendarClock size={17} strokeWidth={2.1} />
        Upcoming External Factors
      </h3>
      <div className="factor-strip" aria-label="7-day external factor outlook">
        {factors.map((factor) => {
          const WeatherIcon = getWeatherIcon(factor.weather);
          return (
            <div key={`${factor.date}-${factor.weather}`} className="factor-card">
              <div className="factor-date">
                {new Date(factor.date).toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </div>

              <div className="factor-line">
                <WeatherIcon size={16} strokeWidth={2.1} />
                <span>{factor.weather}</span>
              </div>

              {factor.is_holiday && (
                <div className="factor-tag purple">
                  <CalendarClock size={14} strokeWidth={2.1} />
                  Holiday alert
                </div>
              )}

              {factor.competitor_undercut && (
                <div className="factor-tag red">
                  <BadgePercent size={14} strokeWidth={2.1} />
                  Price risk
                </div>
              )}

              {!factor.is_holiday && !factor.competitor_undercut && (
                <div className="factor-tag neutral">
                  <ShieldCheck size={14} strokeWidth={2.1} />
                  Standard conditions
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
