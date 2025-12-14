// Render the Gorbagana: Trash Wars game inside the Next.js app.
//
// Using dynamic import with `ssr: false` ensures that the game and its
// dependencies only execute on the client. Without this, Next would try
// to render the game on the server where browser globals like `window`
// and `AudioContext` are undefined.
'use client';

import dynamic from 'next/dynamic';
import React from 'react';

// Lazy load the game component. The relative path navigates out of the
// `app` directory into our `trash-wars` folder. Note that Next.js will
// bundle this separately from the rest of the app.
const TrashWarsApp = dynamic(() => import('../../trash-wars/App'), { ssr: false });

export default function TrashWarsPage() {
  return <TrashWarsApp />;
}