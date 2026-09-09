import { useOutletContext } from "react-router-dom";
import Header from "../components/layout/Header";

export default function Team(){
    const{openMenu} = useOutletContext();

    return (
        <>
            <Header title="Team" onOpenMenu={openMenu}/>
            <div className="p-4 lg:p-6">
                <p className="text-ui text-ink-soft">Member management arrives in a later chunk.</p>
            </div>
        </>
    );
}