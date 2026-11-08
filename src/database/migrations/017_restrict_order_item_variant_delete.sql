-- Pozycje zamówień nie mogą znikać razem z wariantem. Wcześniej ON DELETE CASCADE pozwalało trwale usunąć szkic,
-- który w tym samym czasie został opublikowany i kupiony (audyt 2026-11-08). Serwis i tak usuwa trwale tylko
-- warianty bez zamówień; to ograniczenie jest zabezpieczeniem w samej bazie.
ALTER TABLE order_items
  DROP CONSTRAINT fk_order_items_product_variant,
  ADD CONSTRAINT fk_order_items_product_variant
    FOREIGN KEY (product_variant_id) REFERENCES product_variants (id) ON DELETE RESTRICT;
