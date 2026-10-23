import AdminPanel from './panel';
export const metadata={title:'Yönetim paneli'};
export default function AdminPage(){return <><section className="hero"><div className="eyebrow">Yalnızca yetkili kullanıcı</div><h1>Yayın yönetimi.</h1><p>Makalelerinizi, taslaklarınızı ve mevzuat kayıtlarınızı yönetin.</p></section><AdminPanel/></>}
