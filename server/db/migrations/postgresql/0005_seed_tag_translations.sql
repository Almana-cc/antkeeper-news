-- Seed initial tag translations for FR, EN, ES, DE
-- Topics
INSERT INTO "tag_translations" ("tag_key", "language", "label") VALUES
-- care
('care', 'fr', 'Soins'),
('care', 'en', 'Care'),
('care', 'es', 'Cuidados'),
('care', 'de', 'Pflege'),
-- research
('research', 'fr', 'Recherche'),
('research', 'en', 'Research'),
('research', 'es', 'Investigación'),
('research', 'de', 'Forschung'),
-- behavior
('behavior', 'fr', 'Comportement'),
('behavior', 'en', 'Behavior'),
('behavior', 'es', 'Comportamiento'),
('behavior', 'de', 'Verhalten'),
-- conservation
('conservation', 'fr', 'Conservation'),
('conservation', 'en', 'Conservation'),
('conservation', 'es', 'Conservación'),
('conservation', 'de', 'Naturschutz'),
-- breeding
('breeding', 'fr', 'Élevage'),
('breeding', 'en', 'Breeding'),
('breeding', 'es', 'Cría'),
('breeding', 'de', 'Zucht'),
-- ecology
('ecology', 'fr', 'Écologie'),
('ecology', 'en', 'Ecology'),
('ecology', 'es', 'Ecología'),
('ecology', 'de', 'Ökologie'),

-- Content types
-- study
('study', 'fr', 'Étude'),
('study', 'en', 'Study'),
('study', 'es', 'Estudio'),
('study', 'de', 'Studie'),
-- news
('news', 'fr', 'Actualités'),
('news', 'en', 'News'),
('news', 'es', 'Noticias'),
('news', 'de', 'Nachrichten'),
-- guide
('guide', 'fr', 'Guide'),
('guide', 'en', 'Guide'),
('guide', 'es', 'Guía'),
('guide', 'de', 'Anleitung'),
-- tutorial
('tutorial', 'fr', 'Tutoriel'),
('tutorial', 'en', 'Tutorial'),
('tutorial', 'es', 'Tutorial'),
('tutorial', 'de', 'Tutorial'),
-- community
('community', 'fr', 'Communauté'),
('community', 'en', 'Community'),
('community', 'es', 'Comunidad'),
('community', 'de', 'Gemeinschaft'),
-- opinion
('opinion', 'fr', 'Opinion'),
('opinion', 'en', 'Opinion'),
('opinion', 'es', 'Opinión'),
('opinion', 'de', 'Meinung'),

-- Geographic regions
-- north america
('north america', 'fr', 'Amérique du Nord'),
('north america', 'en', 'North America'),
('north america', 'es', 'América del Norte'),
('north america', 'de', 'Nordamerika'),
-- europe
('europe', 'fr', 'Europe'),
('europe', 'en', 'Europe'),
('europe', 'es', 'Europa'),
('europe', 'de', 'Europa'),
-- amazon
('amazon', 'fr', 'Amazonie'),
('amazon', 'en', 'Amazon'),
('amazon', 'es', 'Amazonía'),
('amazon', 'de', 'Amazonas'),
-- mediterranean
('mediterranean', 'fr', 'Méditerranée'),
('mediterranean', 'en', 'Mediterranean'),
('mediterranean', 'es', 'Mediterráneo'),
('mediterranean', 'de', 'Mittelmeer'),
-- asia
('asia', 'fr', 'Asie'),
('asia', 'en', 'Asia'),
('asia', 'es', 'Asia'),
('asia', 'de', 'Asien'),
-- africa
('africa', 'fr', 'Afrique'),
('africa', 'en', 'Africa'),
('africa', 'es', 'África'),
('africa', 'de', 'Afrika'),

-- Common species (scientific names stay the same, but add display labels)
-- lasius niger
('lasius niger', 'fr', 'Lasius niger'),
('lasius niger', 'en', 'Lasius niger'),
('lasius niger', 'es', 'Lasius niger'),
('lasius niger', 'de', 'Lasius niger'),
-- camponotus
('camponotus', 'fr', 'Camponotus'),
('camponotus', 'en', 'Camponotus'),
('camponotus', 'es', 'Camponotus'),
('camponotus', 'de', 'Camponotus'),
-- formica
('formica', 'fr', 'Formica'),
('formica', 'en', 'Formica'),
('formica', 'es', 'Formica'),
('formica', 'de', 'Formica'),
-- leaf-cutter ants / atta
('leaf-cutter ants', 'fr', 'Fourmis coupe-feuille'),
('leaf-cutter ants', 'en', 'Leaf-cutter ants'),
('leaf-cutter ants', 'es', 'Hormigas cortadoras de hojas'),
('leaf-cutter ants', 'de', 'Blattschneiderameisen'),
-- fire ants
('fire ants', 'fr', 'Fourmis de feu'),
('fire ants', 'en', 'Fire ants'),
('fire ants', 'es', 'Hormigas de fuego'),
('fire ants', 'de', 'Feuerameisen')

ON CONFLICT ("tag_key", "language") DO UPDATE SET "label" = EXCLUDED."label";
