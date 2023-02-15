describe("playlist streams updates", () => {
  const ARTISTS = [
    {
      id: "5qNQYUumr1HFNfepz2WtpV",
      name: "Game Box",
    },
    {
      id: "3yTNaLgtCufxUYDsWa5MpA",
      name: "Kato",
    },
    {
      id: "0cKuIfXXms1PSFWbPrnifu",
      name: "Cato",
    },
    {
      id: "0SazEys8ht80ph1zOJdIId",
      name: "Mr. Nightmare",
    },
    {
      id: "2kCPXzxxoCKAA8ymAUUdjP",
      name: "Nadina loana",
    },
    {
      id: "0nssZpnp8q3bGMQbSXBdRq",
      name: "Epir",
    },
  ];
  it("refresh playlist streams", () => {
    cy.visit(
      "https://accounts.spotify.com/en/login?continue=https%3A%2F%2Fartists.spotify.com%2Fc%2Fartist%2F3yTNaLgtCufxUYDsWa5MpA%2Fmusic%2Fplaylists"
    );
    cy.get("body").then(() => {
      cy.get("#login-username")
        .type("damiflo94@gmail.com")
        .should("have.value", "damiflo94@gmail.com");
      cy.get("#login-password")
        .type("olanrewaju")
        .should("have.value", "olanrewaju");
      cy.contains("Log In").click();
      cy.task("log", "logged in");
      cy.request("http://127.0.0.1:5000/api/v1/playlists").then((response) => {
        const playlists = response.body.playlists?.map(
          (playlist) => playlist.spotifyId
        );
        ARTISTS.forEach((artist) => {
          cy.getPlaylistsStreams(playlists, artist);
        });
      });
    });
  });
});
