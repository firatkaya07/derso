import { EntityList } from "~/components/EntityList";
import { loadClasses } from "~/data/schedule";

export default function ClassesTab() {
  return (
    <EntityList
      searchPlaceholder="Sınıf ara"
      emptyDetail="Sınıfları web uygulamasından ekleyebilirsiniz."
      load={async (organizationId) =>
        (await loadClasses(organizationId)).map((c) => ({
          id: c.id,
          title: c.name,
          detail: c.level ? `${c.level}. seviye` : c.description,
          href: `/sinif/${c.id}`,
        }))
      }
    />
  );
}
