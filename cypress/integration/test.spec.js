describe("it works", () => {
  it("works", () => {
    cy.visit("https://artists.spotify.com");
    cy.contains("Log in").click();
    cy.get("#login-username")
      .type("damiflo94@gmail.com")
      .should("have.value", "damiflo94@gmail.com");
    cy.get("#login-password")
      .type("Drenathan1!")
      .should("have.value", "Drenathan1!");
    cy.contains("Log In").click();
  });
});
