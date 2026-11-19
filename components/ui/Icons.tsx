import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement> & { size?: number };
const I = ({ size = 24, children, ...p }: P & { children: React.ReactNode }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" {...p}>
    {children}
  </svg>
);

export const IconHome = (p: P) => <I {...p}><path d="M12.5 3.25a1 1 0 0 0-1 0l-8 4.62A1 1 0 0 0 3 8.74V20a1 1 0 0 0 1 1h5.5v-6.5h5V21H20a1 1 0 0 0 1-1V8.74a1 1 0 0 0-.5-.87z" /></I>;
export const IconHomeOutline = (p: P) => <I {...p}><path d="M12.5 3.25a1 1 0 0 0-1 0l-8 4.62A1 1 0 0 0 3 8.74V20a1 1 0 0 0 1 1h6v-6h4v6h6a1 1 0 0 0 1-1V8.74a1 1 0 0 0-.5-.87zM19 19h-3v-5a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v5H5V9.32l7-4.04 7 4.04z" /></I>;
export const IconSearch = (p: P) => <I {...p}><path d="M10.53 3a7.53 7.53 0 1 0 4.62 13.48l4.2 4.2 1.42-1.42-4.2-4.2A7.53 7.53 0 0 0 10.53 3zm-5.53 7.53a5.53 5.53 0 1 1 11.06 0 5.53 5.53 0 0 1-11.06 0z" /></I>;
export const IconLibrary = (p: P) => <I {...p}><path d="M4 3h2v18H4zm5 0h2v18H9zm4.6 1.1 1.93-.52 4.66 17.39-1.93.52z" /></I>;
export const IconPlus = (p: P) => <I {...p}><path d="M11 4h2v7h7v2h-7v7h-2v-7H4v-2h7z" /></I>;
export const IconPlay = (p: P) => <I {...p}><path d="M7.05 3.6A1.2 1.2 0 0 0 5.25 4.65v14.7a1.2 1.2 0 0 0 1.8 1.04l12.73-7.35a1.2 1.2 0 0 0 0-2.08z" /></I>;
export const IconPause = (p: P) => <I {...p}><rect x="5.5" y="3.5" width="4.5" height="17" rx="1" /><rect x="14" y="3.5" width="4.5" height="17" rx="1" /></I>;
export const IconNext = (p: P) => <I {...p}><path d="M17.7 3a.7.7 0 0 0-.7.7v6.8L5.05 3.6A.7.7 0 0 0 4 4.2v15.6a.7.7 0 0 0 1.05.6L17 13.5v6.8a.7.7 0 0 0 .7.7h1.6a.7.7 0 0 0 .7-.7V3.7a.7.7 0 0 0-.7-.7z" /></I>;
export const IconPrev = (p: P) => <I {...p}><path d="M6.3 3a.7.7 0 0 1 .7.7v6.8l11.95-6.9A.7.7 0 0 1 20 4.2v15.6a.7.7 0 0 1-1.05.6L7 13.5v6.8a.7.7 0 0 1-.7.7H4.7a.7.7 0 0 1-.7-.7V3.7a.7.7 0 0 1 .7-.7z" /></I>;
export const IconShuffle = (p: P) => <I {...p}><path d="M18.79 2.29 22.5 6l-3.71 3.71-1.42-1.42L18.67 7H17.3a3.5 3.5 0 0 0-2.94 1.6l-1.33 2.04-1.2-1.83 1.2-1.83A5.5 5.5 0 0 1 17.3 5h1.37l-1.3-1.29zM2 5h1.58a5.5 5.5 0 0 1 4.6 2.48l5.96 9.12A3.5 3.5 0 0 0 17.07 18h1.6l-1.3-1.29 1.42-1.42L22.5 19l-3.71 3.71-1.42-1.42L18.67 20h-1.6a5.5 5.5 0 0 1-4.6-2.48L6.5 8.4A3.5 3.5 0 0 0 3.58 7H2zm6.17 9.36 1.2 1.83-.62.95A5.5 5.5 0 0 1 4.12 19H2v-2h2.12a3.5 3.5 0 0 0 2.93-1.57z" /></I>;
export const IconRepeat = (p: P) => <I {...p}><path d="M6 6h11.17l-1.3-1.29 1.42-1.42L21 7l-3.71 3.71-1.42-1.42L17.17 8H6a2 2 0 0 0-2 2v2H2v-2a4 4 0 0 1 4-4zm14 6h2v2a4 4 0 0 1-4 4H6.83l1.3 1.29-1.42 1.42L3 17l3.71-3.71 1.42 1.42L6.83 16H18a2 2 0 0 0 2-2z" /></I>;
export const IconRepeatOne = (p: P) => <I {...p}><path d="M6 6h5v2H6a2 2 0 0 0-2 2v2H2v-2a4 4 0 0 1 4-4zm14 6h2v2a4 4 0 0 1-4 4H6.83l1.3 1.29-1.42 1.42L3 17l3.71-3.71 1.42 1.42L6.83 16H18a2 2 0 0 0 2-2zM16.5 3h1.6v7.5h-1.9V5.4l-1.4.6V4.2z" /></I>;
export const IconHeart = (p: P) => <I {...p}><path d="M16.5 3.5c-1.8 0-3.4.9-4.5 2.3a5.6 5.6 0 0 0-4.5-2.3A5.5 5.5 0 0 0 2 9c0 4.3 4 7.7 9.3 12.1a1.1 1.1 0 0 0 1.4 0C18 16.7 22 13.3 22 9a5.5 5.5 0 0 0-5.5-5.5z" /></I>;
export const IconHeartOutline = (p: P) => <I {...p}><path d="M16.5 3.5c-1.8 0-3.4.9-4.5 2.3a5.6 5.6 0 0 0-4.5-2.3A5.5 5.5 0 0 0 2 9c0 4.3 4 7.7 9.3 12.1a1.1 1.1 0 0 0 1.4 0C18 16.7 22 13.3 22 9a5.5 5.5 0 0 0-5.5-5.5zM12 19C7.1 14.9 4 12.2 4 9a3.5 3.5 0 0 1 3.5-3.5c1.5 0 2.8.9 3.4 2.3l.2.4h1.8l.2-.4a3.7 3.7 0 0 1 3.4-2.3A3.5 3.5 0 0 1 20 9c0 3.2-3.1 5.9-8 10z" /></I>;
export const IconCheckCircle = (p: P) => <I {...p}><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1.2 14.2-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4z" /></I>;
export const IconMore = (p: P) => <I {...p}><circle cx="5" cy="12" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="19" cy="12" r="2" /></I>;
export const IconQueue = (p: P) => <I {...p}><path d="M15 15.5V5h5v2h-3v8.5a3.5 3.5 0 1 1-2-3.16zM3 5h10v2H3zm0 4h10v2H3zm0 4h7v2H3zm10 2.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0z" /></I>;
export const IconNowPlaying = (p: P) => <I {...p}><path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm2 0v14h8V5zm10 0v14h4V5z" /></I>;
export const IconVolume = (p: P) => <I {...p}><path d="M11 4.2a.7.7 0 0 0-1.1-.55L5.65 7H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2.65l4.25 3.35A.7.7 0 0 0 11 19.8zM14 7.3a5.5 5.5 0 0 1 0 9.4l-1-1.73a3.5 3.5 0 0 0 0-5.94zm2.5-4.33a10.5 10.5 0 0 1 0 18.06l-1-1.73a8.5 8.5 0 0 0 0-14.6z" /></I>;
export const IconVolumeLow = (p: P) => <I {...p}><path d="M11 4.2a.7.7 0 0 0-1.1-.55L5.65 7H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2.65l4.25 3.35A.7.7 0 0 0 11 19.8zM14 7.3a5.5 5.5 0 0 1 0 9.4l-1-1.73a3.5 3.5 0 0 0 0-5.94z" /></I>;
export const IconVolumeOff = (p: P) => <I {...p}><path d="M11 4.2a.7.7 0 0 0-1.1-.55L5.65 7H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h2.65l4.25 3.35A.7.7 0 0 0 11 19.8zm4.3 4.1L17.5 10.6l2.3-2.3 1.4 1.4-2.3 2.3 2.3 2.3-1.4 1.4-2.3-2.3-2.3 2.3-1.4-1.4 2.3-2.3-2.3-2.3z" /></I>;
export const IconExpand = (p: P) => <I {...p}><path d="M14 3h7v7h-2V6.41l-4.29 4.3-1.42-1.42L17.59 5H14zM3 14h2v3.59l4.29-4.3 1.42 1.42L6.41 19H10v2H3z" /></I>;
export const IconCollapse = (p: P) => <I {...p}><path d="M20.3 2.3 21.7 3.7 17.41 8H21v2h-7V3h2v3.59zM3 14h7v7H8v-3.59l-4.29 4.3-1.42-1.42L6.59 16H3z" /></I>;
export const IconClose = (p: P) => <I {...p}><path d="M5.7 4.3 12 10.6l6.3-6.3 1.4 1.4-6.3 6.3 6.3 6.3-1.4 1.4-6.3-6.3-6.3 6.3-1.4-1.4 6.3-6.3-6.3-6.3z" /></I>;
export const IconChevronLeft = (p: P) => <I {...p}><path d="M15.7 4.3 8 12l7.7 7.7-1.4 1.4L5.2 12l9.1-9.1z" /></I>;
export const IconChevronRight = (p: P) => <I {...p}><path d="M8.3 4.3 16 12l-7.7 7.7 1.4 1.4 9.1-9.1-9.1-9.1z" /></I>;
export const IconChevronDown = (p: P) => <I {...p}><path d="M4.3 8.3 12 16l7.7-7.7 1.4 1.4-9.1 9.1-9.1-9.1z" /></I>;
export const IconClock = (p: P) => <I {...p}><path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm-1 3h2v5.4l3.5 2.1-1 1.7L11 13.6z" /></I>;
export const IconExternal = (p: P) => <I {...p}><path d="M14 3h7v7h-2V6.41l-8.29 8.3-1.42-1.42L17.59 5H14zM5 5h6v2H5v12h12v-6h2v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" /></I>;
export const IconNote = (p: P) => <I {...p}><path d="M9 4.5 20 2.5v13a3.5 3.5 0 1 1-2-3.16V6.9l-7 1.27V17.5A3.5 3.5 0 1 1 9 14.34zM5.5 16a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11-2a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z" /></I>;
export const IconCheck = (p: P) => <I {...p}><path d="m9.5 16.2-4.2-4.2-1.4 1.4 5.6 5.6L20.1 8.4 18.7 7z" /></I>;
export const IconTrash = (p: P) => <I {...p}><path d="M9 3h6l1 2h4v2H4V5h4zM6 9h12l-1 11a2 2 0 0 1-2 1.8H9A2 2 0 0 1 7 20zm2.1 2 .8 8.8h6.2l.8-8.8z" /></I>;
export const IconPencil = (p: P) => <I {...p}><path d="M16.3 2.9a2 2 0 0 1 2.8 0l2 2a2 2 0 0 1 0 2.8L8.6 20.2 3 21l.8-5.6zm-1.4 4.2L5.7 16.3l-.3 2.3 2.3-.3 9.2-9.2zm1.4-1.4 2 2 1.4-1.4-2-2z" /></I>;
export const IconGrip = (p: P) => <I {...p}><circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" /></I>;
export const IconAlbum = (p: P) => <I {...p}><path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm0 5a3 3 0 1 1 0 6 3 3 0 0 1 0-6zm0 2a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" /></I>;
export const IconGlobe = (p: P) => <I {...p}><path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm-1.6 2.2A8 8 0 0 0 4.06 11h3.98c.13-2.5.94-4.85 2.36-6.8zm3.2 0c1.42 1.95 2.23 4.3 2.36 6.8h3.98a8 8 0 0 0-6.34-6.8zM12 4.6c-1.3 1.76-2.06 3.9-2.2 6.4h4.4c-.14-2.5-.9-4.64-2.2-6.4zM4.06 13a8 8 0 0 0 6.34 6.8C8.98 17.85 8.17 15.5 8.04 13zm5.74 0c.14 2.5.9 4.64 2.2 6.4 1.3-1.76 2.06-3.9 2.2-6.4zm6.16 0c-.13 2.5-.94 4.85-2.36 6.8a8 8 0 0 0 6.34-6.8z" /></I>;
export const IconUsers = (p: P) => <I {...p}><path d="M9 4a4 4 0 1 1 0 8 4 4 0 0 1 0-8zm0 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm7.5 0a3.5 3.5 0 1 1 0 7 3.5 3.5 0 0 1 0-7zM9 13c3.9 0 7 2 7 4.5V20H2v-2.5C2 15 5.1 13 9 13zm0 2c-2.8 0-4.6 1.3-5 2.5v.5h10v-.5c-.4-1.2-2.2-2.5-5-2.5zm8.6-1c2.6.3 4.4 1.7 4.4 3.5V20h-4v-2.5c0-1.4-.2-2.5-.4-3.5z" /></I>;
export const IconInfo = (p: P) => <I {...p}><path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm0 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16zm-1 6h2v7h-2zm0-3h2v2h-2z" /></I>;
export const IconQueueAdd = (p: P) => <I {...p}><path d="M3 5h12v2H3zm0 4h12v2H3zm0 4h8v2H3zm14-2h2v3h3v2h-3v3h-2v-3h-3v-2h3z" /></I>;
export const IconPlayNext = (p: P) => <I {...p}><path d="M3 5h14v2H3zm0 4h9v2H3zm0 4h9v2H3zm12-2.5 6 4-6 4z" /></I>;
export const IconSidebar = (p: P) => <I {...p}><path d="M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm2 0v14h4V5zm6 0v14h8V5z" /></I>;
export const IconGrid = (p: P) => <I {...p}><path d="M3 3h8v8H3zm2 2v4h4V5zm8-2h8v8h-8zm2 2v4h4V5zM3 13h8v8H3zm2 2v4h4v-4zm8-2h8v8h-8zm2 2v4h4v-4z" /></I>;
export const IconMic = (p: P) => <I {...p}><path d="M12 2a4 4 0 0 1 4 4v5a4 4 0 0 1-8 0V6a4 4 0 0 1 4-4zm0 2a2 2 0 0 0-2 2v5a2 2 0 0 0 4 0V6a2 2 0 0 0-2-2zM5 10h2v1a5 5 0 0 0 10 0v-1h2v1a7 7 0 0 1-6 6.93V21h-2v-3.07A7 7 0 0 1 5 11z" /></I>;
export const IconPhoto = (p: P) => <I {...p}><path d="M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm0 2v9.6l4-4 5 5 3-3 4 4V6zm11.5 1a2 2 0 1 1 0 4 2 2 0 0 1 0-4z" /></I>;
export const IconSpeaker = (p: P) => <I {...p}><path d="M10 4.2a.7.7 0 0 0-1.1-.55L4.65 7H2.8a.8.8 0 0 0-.8.8v8.4c0 .44.36.8.8.8h1.85l4.25 3.35A.7.7 0 0 0 10 19.8zM13 7.3a5.5 5.5 0 0 1 0 9.4l-1-1.73a3.5 3.5 0 0 0 0-5.94z" /></I>;
export const IconShare = (p: P) => <I {...p}><path d="M18 2a3 3 0 1 1-2.2 5.03l-6.9 3.98a3 3 0 0 1 0 1.98l6.9 3.98a3 3 0 1 1-1 1.73l-6.9-3.98a3 3 0 1 1 0-5.44l6.9-3.98A3 3 0 0 1 18 2zm0 2a1 1 0 1 0 0 2 1 1 0 0 0 0-2zM6 11a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm12 7a1 1 0 1 0 0 2 1 1 0 0 0 0-2z" /></I>;
export const IconUpload = (p: P) => <I {...p}><path d="M11 15.5V6.83L7.7 10.1 6.3 8.7 12 3l5.7 5.7-1.4 1.4L13 6.83v8.67zM4 14h2v4h12v-4h2v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z" /></I>;
export const IconTelegram = (p: P) => <I {...p}><path d="M21.94 4.66 18.9 19.04c-.22 1-.82 1.25-1.66.78l-4.6-3.39-2.22 2.14c-.25.25-.45.45-.93.45l.33-4.7 8.56-7.73c.37-.33-.08-.52-.58-.19L7.22 13.06l-4.56-1.42c-.99-.31-1-1 .21-1.47L20.7 3.3c.83-.3 1.55.2 1.24 1.36z" /></I>;
export const IconKey = (p: P) => <I {...p}><path d="M14.5 2a7.5 7.5 0 1 1-2.25 14.66L10.9 18H9v2H7v2H2v-4.4l7.34-7.35A7.5 7.5 0 0 1 14.5 2zm0 2a5.5 5.5 0 0 0-5.2 7.3l.2.6L4 17.4V20h1v-2h2v-2h3.07l2.3-2.3.6.2A5.5 5.5 0 1 0 14.5 4zm1.5 2.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3z" /></I>;
export const IconRefresh = (p: P) => <I {...p}><path d="M12 4a8 8 0 0 1 7.43 5H17v2h6V5h-2v2.35A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8zm8 8a8 8 0 0 1-15.43 3H7v-2H1v6h2v-2.35A10 10 0 0 0 22 12z" /></I>;
export const IconVideo = (p: P) => <I {...p}><path d="M4 5h11a2 2 0 0 1 2 2v2.4l3.45-2.3A1 1 0 0 1 22 7.9v8.2a1 1 0 0 1-1.55.83L17 14.6V17a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2zm0 2v10h11V7zm13 4.8v.4l3 2V9.8z" /></I>;
export const IconVideoOff = (p: P) => <I {...p}><path d="M3.7 2.3 21.7 20.3l-1.4 1.4-2.73-2.73A2 2 0 0 1 15 19H4a2 2 0 0 1-2-2V7a2 2 0 0 1 1.04-1.75L2.3 3.7zM4.83 7H4v10h11v-.17zM8.83 5H15a2 2 0 0 1 2 2v2.4l3.45-2.3A1 1 0 0 1 22 7.9v8.2a1 1 0 0 1-1.07 1l-1.9-1.9L20 14.2V9.8l-3 2v1.37l-2-2V7h-4.17z" /></I>;
