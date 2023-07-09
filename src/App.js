import React, { useEffect, useState } from "react";
import { MockProvider, Providers } from "@microsoft/mgt-element";
import { Login, Get } from "@microsoft/mgt-react";
import "./App.css";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import { MsalProvider } from "@microsoft/mgt-msal-provider";
import { ProxyProvider } from "@microsoft/mgt-proxy-provider";
import {
  useSiteEditUrl,
  checkProxy,
  AdaptiveCard,
  Calender,
} from "wp-webcomponent";
import { usePopper } from "react-popper";

const formatDate = (date) => {
  const tempDate = new Date(date);
  const now_utc = Date.UTC(
    tempDate.getUTCFullYear(),
    tempDate.getUTCMonth(),
    tempDate.getUTCDate(),
    tempDate.getUTCHours(),
    tempDate.getUTCMinutes(),
    tempDate.getUTCSeconds()
  );
  return new Date(now_utc);
};

const buildQuery = (props, siteDetails) => {
  let url = `/sites/${props.site_id ?? siteDetails?.siteId}/lists/${
    props.list_id ?? siteDetails?.listId
  }/items`;
  let hasQuery = false;
  if (props.columns) {
    url += `?expand=fields(select=${props.columns})`;
    hasQuery = true;
  }
  if (props.category) {
    url += hasQuery ? "&" : "?";
    url += `filter=Category eq '${props.category}'`;
  }
  if (props.from_date) {
    url += hasQuery ? "&" : "?";
    url += `filter=EventDate gt '${props.from_date}'`;
  }
  if (props.to_date) {
    url += hasQuery ? "&" : "?";
    url += `filter=EventDate lt '${props.from_date}'`;
  }
  return url;
};

function App(props) {
  // setup proxy
  const serverProxyDomain = checkProxy();

  useEffect(() => {
    if (serverProxyDomain) {
      console.log("using proxy: ", serverProxyDomain);
      Providers.globalProvider = new ProxyProvider(serverProxyDomain);
    } else {
      console.log("using msal", props);
      Providers.globalProvider = new MsalProvider({
        clientId: props.clientid,
        scopes: ["Sites.FullControl.All", "Calendars.ReadWrite"],
      });
    }
  }, [serverProxyDomain]);

  // setup initial data
  const siteDetails = useSiteEditUrl(props.list_setting_url, props.site_name);
  const [eventsData, setEventsData] = useState([]);
  const [dataLoaded, setDataLoaded] = useState(false);

  const Events = (eventProps) => {
    console.log({ props1: eventProps });
    const tempData = [];

    useEffect(() => {
      eventProps.dataContext.value.forEach((event) => {
        // console.log({
        //   event: event,
        // });
        // tempData.push({ title: event.subject, start: formatDate(event.start.dateTime), end: formatDate(event.end.dateTime), url:event.webLink })
        tempData.push({
          title: event.fields.Title,
          start: formatDate(event.fields.EventDate),
          end: formatDate(event.fields.EndDate),
        });
      });
      setEventsData(tempData);
      setDataLoaded(true);
      window.dispatchEvent(
        new CustomEvent("on_event_data_loaded", {
          detail: {
            events: {
              events: tempData,
            },
            template: props.template ?? Calender.template,
          },
        })
      );
    }, [eventProps.dataContext.value]);

    return <></>;
  };

  console.log("ed", eventsData);
  // console.log({
  //   props, siteDetails, eventsData
  // })

  const AdaptiveCardLayout = Calender;
  const resourceQuery = buildQuery(props, siteDetails);
  console.log("rq", resourceQuery);

  // just for testing
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const testEventData = [
    {
      end: new Date(),
      start: new Date(),
      title: "Birthday Party",
      meta: { id: "lulzsec" },
    },
    {
      end: new Date(),
      start: new Date(),
      title: "Friend's birthday party",
      meta: { id: 2 },
    },
    {
      end: new Date(+new Date() + 2 * ONE_DAY),
      start: new Date(+new Date() + ONE_DAY),
      title: "snowy days",
      meta: { id: 3 },
    },
  ];
  const [hoveredEvent, setHoveredEvent] = useState(null);
  const [popperElement, setPopperElement] = useState(null);
  const [virtualRef, setVirtualRef] = useState(null);
  const { styles, attributes } = usePopper(virtualRef, popperElement, {
    placement: "right",
  });

  useEffect(() => {
    if (!hoveredEvent) return;

    setVirtualRef({
      getBoundingClientRect() {
        const rect = JSON.parse(hoveredEvent.el.dataset.coords);
        return {
          top: rect.top,
          left: rect.left,
          bottom: rect.bottom,
          right: rect.right,
          width: rect.width,
          height: rect.height,
        };
      },
    });
  }, [hoveredEvent]);

  return (
    <>
      {siteDetails.error && <p>{siteDetails.error}</p>}
      <h1>{props.title ?? "Sharepoint Calendar"}</h1>
      <Login />
      {!dataLoaded && <p>Loading data..</p>}
      {!siteDetails.loading && (
        <Get
          // resource={'/me/calendar/events'}
          resource={resourceQuery}
          // resource={"/me/mailFolders('SentItems')/messages?$select=sender,subject"}
          version="v1.0"
          cacheEnabled
        >
          <Events />
        </Get>
      )}
      {props.layout === "calendar" && dataLoaded && (
        <div style={{ padding: "2rem" }}>
          <FullCalendar
            plugins={[dayGridPlugin]}
            initialView="dayGridMonth"
            // weekends={!!props.weekends}
            events={testEventData}
            eventDidMount={function (info) {
              info.el.dataset.coords = JSON.stringify(
                info.el.getBoundingClientRect()
              );
            }}
            eventMouseEnter={function (e) {
              if (hoveredEvent?.event.id !== e.event.id) {
                setHoveredEvent({ el: e.el, event: e.event });
              }
            }}
            eventMouseLeave={function (e) {
              setHoveredEvent(null);
            }}
            // eventContent={renderEventContent}
          />

          {hoveredEvent && (
            <div
              ref={setPopperElement}
              style={{
                ...styles.popper,
                padding: "20px",
                backgroundColor: "white",
                zIndex: 1,
                boxShadow: "0 0 50px 0 rgb(82 63 105 / 15%)",
              }}
              {...attributes.popper}
            >
              {hoveredEvent.event.title}
            </div>
          )}
        </div>
      )}
      {props.layout === "list" && dataLoaded && (
        <div>
          <AdaptiveCard
            data={{
              events: eventsData.slice(0, 5),
            }}
            card={props.props ?? AdaptiveCardLayout.template}
          />
        </div>
      )}
      {props.layout === "adaptive card" && dataLoaded && (
        <div>Not Implemented</div>
      )}
      {!["calendar", "list", "adaptive card"].includes(props.layout) && (
        <div>Unknown layout specified.</div>
      )}
    </>
  );
}

export const Definition = [
  {
    zone: "appearances",
    component: "HeadingColorAndSize",
    name: ["headingColor", "headingSize"],
    createSeparateSection: true,
    title: "Heading",
  },
  {
    zone: "appearances",
    component: "TextBox",
    name: "title",
    displayName: "Title",
    title: "Title",
  },
  {
    zone: "appearances",
    component: "TextBox",
    name: "description",
    displayName: "Description",
    createSeparateSection: true,
    title: "Description",
  },
  {
    zone: "appearances",
    component: "BackgroundType",
    name: ["typeSelected", "changeBgColor", "changeBgOverlay", "selectedImage"],
    displayName: "Background Type",
    createSeparateSection: true,
    title: "Background Type",
  },
  {
    zone: "layout",
    component: "ComponentLayout",
    name: ["layout", "layoutSpacing"],
    enum: ["list", "month", "grid"],
  },
  {
    component: "TextBox",
    name: "siteid",
    displayName: "Site Id",
    title: "Site Id",
  },
  {
    component: "TextBox",
    name: "listid",
    displayName: "List Id",
    title: "List Id",
  },
  {
    component: "TextBox",
    name: "from_date",
    displayName: "Start Date",
    title: "Start Date",
  },
  {
    component: "TextBox",
    name: "to_date",
    displayName: "End Date",
    title: "End Date",
  },
  {
    component: "TextBox",
    name: "category",
    displayName: "Category",
    title: "Category",
  },
  {
    component: "TextBox",
    name: "initial_month",
    displayName: "Month",
    title: "Month",
  },
  {
    component: "TextBox",
    name: "columns",
    displayName: "Columns",
    title: "Columns",
  },
  {
    component: "TextBox",
    name: "sort",
    displayName: "Sort By",
    title: "Sort By",
  },
  {
    component: "TextBox",
    name: "timediff",
    displayName: "Time Difference",
    title: "Time Difference",
  },
  {
    component: "TextBox",
    name: "timezone",
    displayName: " Time Zone",
    title: "Time Zone",
  },
  {
    component: "TextBox",
    name: "mthviewdaylimit",
    displayName: "Month View Day Limit",
    title: "Month View Day Limit",
  },
  {
    zone: "setting",
    component: "ElementsToDisplay",
    name: "elementsToDisplay",
    displayName: "Elements To Display",
    createSeparateSection: true,
    title: "Elements To Display",
    enum: [
      "EventType",
      "Button",
      "ImageOrVideo",
      "Tags",
      "Description",
      "Venue",
      "Map",
      "Host",
      "Share",
      "Countdown",
      "ShowPrintButton",
    ],
  },
  {
    zone: "setting",
    component: "Switch",
    name: "switch",
    displayName: "Switch",
    createSeparateSection: true,
    title: "Switch",
  },
  {
    zone: "setting",
    component: "Date",
    name: ["startDate", "endDate"],
    displayName: "Date",
    createSeparateSection: true,
    title: "Date",
  },
  {
    zone: "setting",
    component: "Rating",
    name: "review",
    displayName: "Rating",
    createSeparateSection: true,
    title: "Rating",
  },
];

export const ProxyPayload = {
  site_id: "87fb8dbb-4dd8-42e6-8ab9-8bf82b1319f5",
  list_id: "752f0c5c-2d79-4d6a-b694-0184a3fb63c4",
  site_name: "DWS Team Portal",
  list_setting_url:
    "https://dwsnow.sharepoint.com/aloedev/_layouts/15/listedit.aspx?List=%7B752f0c5c-2d79-4d6a-b694-0184a3fb63c4%7D",
};

export default App;
