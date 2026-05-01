self.addEventListener("push", function (event) {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "Blackspire Reality", body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Blackspire Reality", {
      body: data.body || "",
    })
  );
});

