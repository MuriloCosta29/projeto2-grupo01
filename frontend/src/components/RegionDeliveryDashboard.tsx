import type { RegionDeliveryImpact } from "../types";

type RegionDeliveryDashboardProps = {
  regions: RegionDeliveryImpact[];
  selectedRegion: string;
  onSelectRegion: (region: string) => void;
};

export function RegionDeliveryDashboard({
  regions,
  selectedRegion,
  onSelectRegion,
}: RegionDeliveryDashboardProps) {
  const selectedRegionData =
    regions.find((region) => region.region === selectedRegion) ?? null;
  const totalDeliveries = regions.reduce(
    (total, region) => total + region.total_deliveries,
    0,
  );
  const totalFamilies = regions.reduce(
    (total, region) => total + region.families_count,
    0,
  );

  return (
    <section className="panel region-dashboard">
      <div className="panel-header">
        <div>
          <p className="eyebrow">US13</p>
          <h2>Entregas por Região</h2>
        </div>
      </div>

      <label>
        Região
        <select
          value={selectedRegion}
          onChange={(event) => onSelectRegion(event.target.value)}
        >
          <option value="all">Todas as regiões</option>
          {regions.map((region) => (
            <option key={region.region} value={region.region}>
              {region.region}
            </option>
          ))}
        </select>
      </label>

      <div className="region-metrics">
        <article>
          <span>Cestas entregues</span>
          <strong>
            {selectedRegionData?.total_deliveries ?? totalDeliveries}
          </strong>
        </article>
        <article>
          <span>Famílias na região</span>
          <strong>{selectedRegionData?.families_count ?? totalFamilies}</strong>
        </article>
      </div>
    </section>
  );
}
