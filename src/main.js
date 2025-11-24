import "./style.css";
import PocketBase from "pocketbase";

const pb = new PocketBase("http://127.0.0.1:8090");


const map = L.map("map").setView([45.42, 10.08], 13);

L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> and contributors',
}).addTo(map);

const ICON_SIZE = [40, 40];
const icons = {
  sun: L.icon({
    iconUrl: "sun.png",
    iconSize: ICON_SIZE,
    iconAnchor: [20, 40],
    popupAnchor: [0, -30],
  }),
  rain: L.icon({
    iconUrl: "rain.png",
    iconSize: ICON_SIZE,
    iconAnchor: [20, 40],
    popupAnchor: [0, -30],
  }),
  high: L.icon({
    iconUrl: "hight.png",
    iconSize: ICON_SIZE,
    iconAnchor: [20, 40],
    popupAnchor: [0, -30],
  }),
  low: L.icon({
    iconUrl: "low.png",
    iconSize: ICON_SIZE,
    iconAnchor: [20, 40],
    popupAnchor: [0, -30],
  }),
};

const legenda = L.control({ position: "bottomright" });

legenda.onAdd = function (map) {
  const div = L.DomUtil.create("div", "legend");
  div.innerHTML = `
    <h4>Legenda</h4>
    <div><img src="hight.png" class="legend-icon"> Temperatura Elevata</div>
    <div><img src="low.png" class="legend-icon"> Temperatura Ridotta</div>
    <div><img src="sun.png" class="legend-icon"> Soleggiato</div>
    <div><img src="rain.png" class="legend-icon"> Piovoso</div>
  `;
  L.DomEvent.disableClickPropagation(div);
  return div;
};

legenda.addTo(map);


const markersLayer = L.layerGroup().addTo(map);


let stats = {
  count: 0,
  tAvg: 0,
  tMax: -Infinity,
  tMin: Infinity,
};


function getWeatherIcon(item, tMin, tMax) {
  const temp = Number(item.temperature);
  const precip = Number(item.precipitation);

  if (Number.isFinite(precip) && precip > 0) return icons.rain;
  if (Number.isFinite(temp) && temp === tMin) return icons.low;
  if (Number.isFinite(temp) && temp === tMax) return icons.high;
  return icons.sun;
}



function buildPopupHtml(item) {
  const temp = item.temperature ?? "N/A";
  const hum = item.humidity ?? "N/A";
  const precip = item.precipitation ?? "N/A";
  const desc = item.description ?? "Sconosciuta";
  return `
    <strong>${desc}</strong><br/>
    temperatura: ${temp}°C<br/>
    umidità: ${hum}%<br/>
    precipitazioni: ${precip} mm
  `;
}

function addMarkerToMap(item, tMin, tMax) {
  if (!item?.geopoint || item.geopoint.lat == null || item.geopoint.lon == null) return;
  const icon = getWeatherIcon(item, tMin, tMax);
  const marker = L.marker([item.geopoint.lat, item.geopoint.lon], { icon });
  marker.bindPopup(buildPopupHtml(item));
  markersLayer.addLayer(marker);
}



function updateStatsDom() {
  document.getElementById("marker").innerText = `${stats.count}`;
  document.getElementById("tmax").innerText =
    Number.isFinite(stats.tMax) ? `${stats.tMax} °C` : `N/A`;
  document.getElementById("tmin").innerText =
    Number.isFinite(stats.tMin) ? `${stats.tMin} °C` : `N/A`;
  document.getElementById("tavg").innerText = Number.isFinite(stats.tAvg)
    ? `${stats.tAvg.toFixed(2)} °C`
    : `N/A`;
}


async function updateMap() {
  try {
    const resultList = await pb.collection("prova").getList(1, 200);
    const items = resultList.items ?? [];

    stats = { count: items.length, tAvg: 0, tMax: -Infinity, tMin: Infinity };

    if (items.length === 0) {
      markersLayer.clearLayers();
      updateStatsDom();
      return;
    }

    let somma = 0;
    for (const item of items) {
      const temp = Number(item.temperature);

      if (Number.isFinite(temp)) {
        somma += temp;
        if (temp > stats.tMax) stats.tMax = temp;
        if (temp < stats.tMin) stats.tMin = temp;
      }
    }
    stats.tAvg = somma / items.length;
    markersLayer.clearLayers();

      for (const item of items) {
        addMarkerToMap(item, stats.tMin, stats.tMax);
      }
      
    updateStatsDom();

  } catch (err) {
    console.error("Errore updateMap:", err);
  }
}



async function getMapData() {
  try {
    const resultList = await pb.collection("prova").getList(1, 200);
    const items = resultList.items ?? [];

    for (const item of items) {
      const updated = {
        geopoint: item.geopoint,
        description: item.description,
        temperature: item.temperature,
        humidity: item.humidity,
        precipitation: item.precipitation,
      };


      if (!updated.description || updated.description.trim() === "") {
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${item.geopoint.lat}&lon=${item.geopoint.lon}&format=json`
          );

          if (response.ok) {
            const data = await response.json();
            updated.description = data.name || data.display_name || "Sconosciuta";
          }
        } catch (err) {
          console.error("Errore reverse geocode:", err);
        }
      }

      try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${item.geopoint.lat}&longitude=${item.geopoint.lon}&current=temperature_2m,relative_humidity_2m,precipitation`;

        const responseM = await fetch(url);

        if (responseM.ok) {
          const dataM = await responseM.json();
          updated.temperature = dataM.current?.temperature_2m ?? updated.temperature;
          updated.humidity = dataM.current?.relative_humidity_2m ?? updated.humidity;
          updated.precipitation = dataM.current?.precipitation ?? updated.precipitation;
        }
      } catch (err) {
        console.error("Errore meteo:", err);
      }

      try {
        await pb.collection("prova").update(item.id, updated);
      } catch (err) {
        console.error("Errore update PB:", err);
      }
    }

    updateMap();
  } catch (err) {
    console.error("Errore generale getMapData:", err);
  }
}



map.on("click", async function (ev) {
  try {
    const data = {
      geopoint: {
        lon: ev.latlng.lng,
        lat: ev.latlng.lat,
      },
      description: "",
      temperature: null,
      humidity: null,
      precipitation: null,
    };

    const record = await pb.collection("prova").create(data);
    console.log("Nuovo record creato:", record.id);
    await getMapData();
  } catch (err) {
    console.error("Errore on map click:", err);
  }
});


(async function init() {
  await getMapData();
})();


let allItems = []; 

const originalUpdateMap = updateMap;
updateMap = async function () {
  const resultList = await pb.collection("prova").getList(1, 200);
  allItems = resultList.items ?? [];
  await originalUpdateMap();
};



function applyFilter() {
  const text = document.getElementById("filterText").value.toLowerCase().trim();
  const min = document.getElementById("filterMin").value.trim();
  const max = document.getElementById("filterMax").value.trim();

  const minVal = min !== "" ? Number(min) : null;
  const maxVal = max !== "" ? Number(max) : null;

  const filtered = allItems.filter(item => {
    const desc = (item.description || "").toLowerCase();
    const temp = Number(item.temperature);
    if (text !== "" && !desc.includes(text)) return false;
    if (minVal !== null && temp < minVal) return false;
    if (maxVal !== null && temp > maxVal) return false;
    return true;
  });

  renderFiltered(filtered);
}




function renderFiltered(list) {
  markersLayer.clearLayers();


  let tMin = Infinity, tMax = -Infinity;

  for (const item of list) {
    const t = Number(item.temperature);
    if (Number.isFinite(t)) {
      if (t < tMin) tMin = t;
      if (t > tMax) tMax = t;
    }
  }

  if (list.length === 0) {
    document.getElementById("filterResults").innerText = "Risultati: 0";
    return;
  }


  for (const item of list) {
    addMarkerToMap(item, tMin, tMax);
  }

  document.getElementById("filterResults").innerText =
    `Risultati: ${list.length}`;
}




document.getElementById("applyFilter").onclick = applyFilter;

document.getElementById("resetFilter").onclick = () => {
  document.getElementById("filterText").value = "";
  document.getElementById("filterMin").value = "";
  document.getElementById("filterMax").value = "";
  renderFiltered(allItems); 
};


