// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
//
//
// -- This is a parent command --
// Cypress.Commands.add('login', (email, password) => { ... })
//
//
// -- This is a child command --
// Cypress.Commands.add('drag', { prevSubject: 'element'}, (subject, options) => { ... })
//
//
// -- This is a dual command --
// Cypress.Commands.add('dismiss', { prevSubject: 'optional'}, (subject, options) => { ... })
//
//
// -- This will overwrite an existing command --
// Cypress.Commands.overwrite('visit', (originalFn, url, options) => { ... })

Cypress.Commands.add("getPlaylistsStreams", (playlists, artist) => {
  if (playlists?.length) {
    cy.visit(
      `https://artists.spotify.com/c/artist/${artist.id}/music/playlists`
    );
    cy.contains("Last 28 days");
    cy.intercept({
      url: `https://generic.wg.spotify.com/s4x-insights-api/v1/artist/${artist.id}/playlists/listener?time-filter=1day`,
    }).as("listeners");
    cy.contains("Last 28 days").click();
    cy.get('*[class^="Overlay-u80gmt-0"]')
      .within(() => {
        cy.contains("Last 24 hours").click();
      })
      .then(() => {
        cy.wait("@listeners").then((interception) => {
          const foundPlaylists = [];
          playlists.forEach((playlist) => {
            const data = interception.response.body.data.find((item) => {
              return item.uri.includes(playlist);
            });
            if (data)
              foundPlaylists.push({
                spotifyId: playlist,
                streams: data.streams,
              });
          });

          foundPlaylists.forEach((playlist) => {
            const url =
              process.env.NODE_ENV === "production"
                ? `https://tts-systems.de/api/v1/playlists/${playlist.spotifyId}/streams`
                : `http://127.0.0.1:5000/api/v1/playlists/${playlist.spotifyId}/streams`;

            cy.request("POST", url, {
              streams: playlist.streams,
              artistId: artist.id,
              artistName: artist.name,
            });
          });
          // console.log(interception.response.body.data, foundPlaylists, artist);
        });
      });
  }
});
