# Uwagi do panelu admina

Notatki z budowy API dla osobnego repo panelu. Nie ma tu gotowych rozwiązań, tylko to, co warto wiedzieć przed
startem, i moje sugestie. Szczegóły endpointów: Swagger (`/api-docs`) i specyfikacja `/api-docs.json`.

## Sugestie ogólne

- **Stos technologiczny.** Wystarczy prosta aplikacja SPA: React + TypeScript + Vite. Do danych z API TanStack Query
  (cache, odświeżanie po zmianach), do formularzy react-hook-form. Bez SSR i bez własnego backendu, bo panel tylko
  rozmawia z API.
- **Typy z API, nie pisane ręcznie.** Generować je z `/api-docs.json` (np. `openapi-typescript`) i odświeżać przy
  zmianach w API.
- **Formularze atrybutów z typów produktów.** `GET /products/types` zwraca JSON Schema pól produktu i wariantu dla
  każdego typu (winyl, koszulka, inne). Formularz wariantu może się z nich budować, wtedy nowy typ w API nie wymaga
  zmian w panelu. Na start wystarczy jednak ręczny formularz dla winyla i prosty dla pozostałych.
- **Mobile first dla kreatora.** Zdjęcie labelu robi się telefonem, więc kreator musi wygodnie działać na telefonie
  (aparat przez `<input type="file" accept="image/*" capture>`). Reszta panelu może być desktopowa.
- **Język panelu.** Interfejs panelu po polsku wystarczy. Trzy języki (EN/ES/PL) dotyczą treści dla klientów: na
  razie tylko notatki o stanie płyty.

## Logowanie i uprawnienia

- `POST /login` zwraca token JWT. Nie ma odświeżania tokenu: po wygaśnięciu każde żądanie dostaje 401, więc panel
  powinien wtedy wylogować i wrócić do logowania, najlepiej zachowując niezapisany formularz.
- Po zalogowaniu `GET /users/me`: wpuszczamy tylko użytkownika z uprawnieniami `products:*`. Przyciski pokazujemy
  według uprawnień (`products:publish` do publikacji, `settings:manage` do ustawień).
- Token trzymać w pamięci albo w `sessionStorage`, nie w `localStorage`. To prosty panel dla jednej osoby, ale nie
  ma powodu, żeby token żył dłużej niż karta.
- Adres panelu musi być dopisany do `CORS_ORIGIN` w `.env` API.

## Kreator dodawania płyty

Kolejność ustalona wcześniej: zdjęcie → produkt → wariant → media → podsumowanie.

1. **Zdjęcie labelu** (`POST /products/lookup/photo`, pole `images`, 1–2 zdjęcia JPEG/PNG/WebP, maks. 5 MB każde).
   - Zdjęcia z telefonu bywają większe niż 5 MB. Warto je zmniejszyć w przeglądarce przed wysłaniem (np. do 2000 px
     na dłuższym boku): szybciej się wysyłają i taniej czyta je Claude.
   - Odpowiedź zawiera odczyt z labelu, kandydatów z Discogs i `photoUploadIds`. Te identyfikatory trzeba zachować do
     kroku wariantu: tak zdjęcie labelu staje się głównym zdjęciem wariantu.
   - **Błąd też zawiera `photoUploadIds`.** Gdy Claude albo Discogs zawiodą (502/503), panel przechodzi do formularza
     ręcznego i nadal może podpiąć to zdjęcie.
   - `photoUploadIds` są ważne 24 godziny. Szkic porzucony na dłużej trzeba uzupełnić zdjęciem przez endpoint mediów.
2. **Wybór wydania.** Lista kandydatów (miniatura, artysta – tytuł, wytwórnia, numer katalogowy, rok, kraj, format),
   także przy jednym wyniku, plus opcja „żadne z nich, wpisz ręcznie” (formularz z odczytu Claude). Wybór →
   `GET /products/lookup/releases/:releaseId` zwraca szkic produktu i wariantu oraz `existingProducts`.
3. **Duplikaty.** Jeśli `existingProducts` nie jest puste, zaproponować dodanie wariantu do istniejącego produktu
   zamiast nowego produktu. `matchedBy` mówi dlaczego: to samo wydanie, numer katalogowy albo tytuł z artystą (ten sam
   album w innym tłoczeniu). Przy wpisywaniu ręcznym: `GET /products/lookup/existing`.
4. **Uzupełnianie pustych pól.** Discogs nie zawsze podaje wszystko. Przykład: ZV-7-006 nie ma prędkości, a Claude
   czyta „45 RPM” z labelu. Puste pola szkicu z Discogs warto uzupełnić odczytem ze zdjęcia, oznaczając, skąd pochodzą.
5. **Wariant.** Stan płyty i okładki w skali Goldmine (okładka ma też `generic` i `no_cover`), cena w EUR, ilość
   domyślnie 1. Notatkę o stanie wpisuje się po polsku, a `POST /products/lookup/condition-note` tłumaczy ją na EN i
   ES. Tłumaczenie pokazać do potwierdzenia i poprawki, nie zapisywać w ciemno.
6. **Media.** `POST /products/variants/:id/media` (pole `file`, maks. 10 MB), kolejność, zdjęcie główne, usuwanie.
7. **Podsumowanie.** Akcje: dodaj kolejny wariant (z danymi tłoczenia skopiowanymi z poprzedniego), opublikuj, zapisz
   bez publikacji, usuń wariant. **Przy jednym wariancie opublikowanego produktu „usuń wariant” zamienia się w „usuń
   produkt”**, bo API zwraca wtedy 409. Publikacja zwraca `warnings`, np. `missing_preview` (brak odsłuchu): pokazać,
   ale nie blokować.

## Ceny

- API przyjmuje i zwraca ceny w **eurocentach** (`1500` = 15,00 €). Panel pokazuje euro, a wysyła centy, bez ułamków.
- Cenę w PLN liczy API (`pricePln`, kurs NBP, zaokrąglenie w górę do pełnego złotego). Panel tylko ją wyświetla, nie
  przelicza sam.

## Discogs: wymóg prawny

Wszędzie, gdzie widać dane z Discogs (w panelu przy szkicu, a w sklepie na stronie produktu), trzeba pokazać dopisek
„Data provided by Discogs.” z linkiem do `https://www.discogs.com/release/{discogsReleaseId}`, bez `nofollow`.
Miniatury z Discogs wolno pokazywać tylko na liście kandydatów do wyboru. Nie zapisujemy ich jako zdjęć produktu.

## Lista produktów

- `GET /products/manage?status=draft|published|all` z tymi samymi filtrami co sklep (artysta, format, stan, wytwórnia,
  cena, dostępność, wyszukiwanie `q`, sortowanie). Szkice z ostrzeżeniami warto wyróżnić. Lista szkiców to
  „niedokończone płyty”.
- Lista panelu nie jest cache'owana, więc po zmianie od razu widać aktualny stan.

## Ustawienia

- `GET /settings` zwraca sekrety tylko zamaskowane. Pole sekretu w panelu: puste z informacją „ustawiony
  (sk-ant…1234)”; wysyłamy tylko nową wartość, `null` usuwa.
- Przycisk „Testuj połączenie”: `POST /settings/test/anthropic` i `/settings/test/discogs`.
- Wybór modelu Claude: Haiku (domyślny, tani) albo Opus (dokładniejszy przy zniszczonych labelach).

## Błędy z API

- Każdy błąd ma kształt `{ message }`. Błędy walidacji mają dodatkowo `errors: [{ path, message }]`, gdzie `path` to
  ścieżka pola, np. `variants.0.attributes.mediaCondition`. Warto mapować je na pola formularza.
- 401: wylogować. 403: brak uprawnienia. 409: konflikt (ostatni wariant, brak stanu). 413: za duży plik. 502/503:
  Claude lub Discogs niedostępne albo nieskonfigurowane, wtedy podpowiedzieć wpisanie ręczne lub ustawienia.

## Czego API jeszcze nie ma (świadomie)

- Zarządzania zamówieniami w panelu, statusów i płatności. Przyjdą z etapem sprzedaży.
- Miniatur zdjęć: `/uploads` serwuje oryginały, więc na liście produktów warto ograniczać rozmiar przez CSS i
  `loading="lazy"`.
- Odsłuchu z własnych nagrań (ffmpeg). Na razie są linki YouTube/Bandcamp w `previewLinks`.
- Masowych operacji (np. publikacja wielu naraz). Na start niepotrzebne.
